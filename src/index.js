import * as THREE from 'three';
import { AudioContext } from 'standardized-audio-context';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import WebXRPolyfill from 'webxr-polyfill';
const polyfill = new WebXRPolyfill();

import gltfPath from './assets/scene.gltf';
import vertices from './assets/vertices2.csv';

const SEPARATION = 5, AMOUNTX = 80, AMOUNTZ = 80;

let container;
let camera, scene, renderer;

let particles;

let mouseX = 0, mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const audioCtx = new AudioContext();
let analyser;

let ampBuffer = new CircularBuffer(4 * AMOUNTZ);
let bufferLength;
let data;

init();
// animate();

const isSafari = navigator.userAgent.indexOf("Safari") !== -1;

console.log("app loaded");

document.addEventListener('click', function() {
    // check if context is in suspended state (autoplay policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
        console.log("start audio context");
    }
}, false);



navigator.mediaDevices.getUserMedia({audio: true, video: false})
    .then((stream) => {
        console.log("stream loaded");
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();

        source.connect(analyser);

        analyser.fftSize = 1024;

        animate();
    });

function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 2 * AMOUNTZ * SEPARATION );
    camera.position.z = (AMOUNTZ * SEPARATION) / 2;

    scene = new THREE.Scene();
    // scene.background = new THREE.Color( 0x999999 );

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(gltfPath, (model) => {
        scene.add(model.scene);
    }, () => {}, (error) => {
        console.log("error ", error)});


    let numParticles = (AMOUNTX * AMOUNTZ) + vertices.length;

    let positions = new Float32Array( numParticles * 3 );
    let scales = new Float32Array( numParticles );

    let i = 0, j = 0;

    for(let vertexIndex = 0; vertexIndex < vertices.length; vertexIndex++) {

        positions[ 3*vertexIndex ] = vertices[vertexIndex][0];
        positions[ (3*vertexIndex) + 1 ] = vertices[vertexIndex][1];
        positions[ (3*vertexIndex) + 2 ] = vertices[vertexIndex][2];
        scales[vertexIndex] = 0;
    }

    for ( let ix = 0; ix < AMOUNTX; ix ++ ) {
        for ( let iz = 0; iz < AMOUNTZ; iz ++ ) {

            positions[ (3*(vertices.length + 1)) + i ] = ( ( AMOUNTX * SEPARATION ) / 2 ) - (ix * SEPARATION); // x
            positions[ (3*(vertices.length + 1)) + i + 1 ] = 0; // y
            positions[ (3*(vertices.length + 1)) + i + 2 ] = ( ( AMOUNTZ * SEPARATION ) / 2) - (iz * SEPARATION); // z

            scales[ vertices.length + 1 + j ] = 0;

            i += 3;
            j ++;
        }
    }

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'scale', new THREE.BufferAttribute( scales, 1 ) );

    let material = new THREE.ShaderMaterial( {

        uniforms: {
            color: { value: new THREE.Color( 0xffffff ) },
        },
        vertexShader: document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent

    } );

    //

    particles = new THREE.Points( geometry, material );
    scene.add( particles );

    //

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    document.addEventListener( 'touchmove', onDocumentTouchMove, false );

    //

    window.addEventListener( 'resize', onWindowResize, false );
}

function averagePower(array) {
    let length = 0.0;
    return Math.sqrt(array.reduce((acc, sample) => {
        length++;
        return acc + Math.pow(sample, 2);
    }, 0) / length);
}

function normaliseByteData(data) {
    const floatArray = new Float32Array(data.length);
    data.forEach((value, i) => {
        floatArray[i] = (value - 128.0) / 128.0
    });
    return floatArray;
}

// let lastVal = 0;
function animate() {
    console.log("animating");
    let bufferLength = analyser.fftSize;
    let data = new Float32Array(bufferLength);

    function draw() {
        requestAnimationFrame( draw );

        analyser.getFloatTimeDomainData(data);

        let amp = averagePower(data);

        // console.log("amp: ", amp);
        ampBuffer.write(amp);
        render();
    }

    draw();
}

function render() {

    camera.position.x += ( mouseX - camera.position.x ) * .005;
    camera.position.y += ( - mouseY - camera.position.y) * .005;
    camera.lookAt( scene.position );

    let positions = particles.geometry.attributes.position.array;
    let scales = particles.geometry.attributes.scale.array;

    for(let particleIndex = 0; particleIndex < scales.length; particleIndex++) {
        let ix = positions[3 * particleIndex];
        let iy = positions[(3 * particleIndex) + 1];
        let iz = positions[(3 * particleIndex) + 2];
        let amp = ampBuffer.read( (- Math.round(Math.sqrt(Math.pow(iz, 2) + Math.pow(iy,2) + Math.pow(ix, 2)))));
        scales[particleIndex] = amp * 7 * SEPARATION;
        // !isSafari && (scales[particleIndex] *= 10);
    }

    ampBuffer.incrementReadPointer();
    // particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;

    renderer.render( scene, camera );
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

//

function onDocumentMouseMove( event ) {
    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;
}

function onDocumentTouchStart( event ) {
    if ( event.touches.length === 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;
    }
}

function onDocumentTouchMove( event ) {
    if ( event.touches.length === 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;
    }
}


function CircularBuffer(length){
    this.writePointer = 0;
    this.readPointer = 0;

    this.buffer = new Float32Array(length);
    this.read = (offset = 0) => this.buffer[(this.readPointer + offset + length) % length];
    this.incrementReadPointer = () => {this.readPointer++; this.readPointer %= length};
    this.write = (val) => {
        this.buffer[this.writePointer] = val;
        this.writePointer++;
        this.writePointer %= length;
    }
}