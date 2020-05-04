import * as THREE from 'three';


const SEPARATION = 100, AMOUNTX = 50, AMOUNTY = 50;

let container;
let camera, scene, renderer;

let particles;

let mouseX = 0, mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const audioCtx = new AudioContext();
let analyser;

let ampBuffer = new CircularBuffer(4 * AMOUNTY);

init();
// animate();

navigator.mediaDevices.getUserMedia({audio: true, video: false})
    .then((stream) => {
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();

        source.connect(analyser);

        analyser.fftSize = 1024;

        animate();
    });

// function buildDots({scene}) {
//     let dots = [];
//     const distance = 20;
//     const dotSpacing = 0.3;
//
//     for(let i = -distance; i < distance; i += dotSpacing) {
//         for (let j = -distance; j < distance; j+= dotSpacing) {
//             geometry = new THREE.SphereGeometry(0.02, 0.2, 0.2);
//             material = new THREE.MeshBasicMaterial();
//             mesh = new THREE.Mesh(geometry, material);
//             material.color = new THREE.Color(1,1,1);
//             material.opacity = 0.0001;
//             mesh.position.x =  i;
//             mesh.position.z = j;
//
//             scene.add(mesh);
//             dots.push(mesh);
//         }
//     }
//
//     return dots;
// }

function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = (AMOUNTY * SEPARATION) / 2;

    scene = new THREE.Scene();

    //

    let numParticles = AMOUNTX * AMOUNTY;

    let positions = new Float32Array( numParticles * 3 );
    let scales = new Float32Array( numParticles );

    let i = 0, j = 0;

    for ( let ix = 0; ix < AMOUNTX; ix ++ ) {

        for ( let iy = 0; iy < AMOUNTY; iy ++ ) {

            positions[ i ] = ( ( AMOUNTX * SEPARATION ) / 2 ) - (ix * SEPARATION); // x
            positions[ i + 1 ] = 0; // y
            positions[ i + 2 ] = ( ( AMOUNTY * SEPARATION ) / 2) - (iy * SEPARATION); // z

            scales[ j ] = 1;

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
    return array.reduce((acc, sample) => {
        length++;
        return acc + Math.abs(sample);
    }, 0) / length;
}

// let lastVal = 0;
function animate() {
    let bufferLength = analyser.fftSize;
    let data = new Float32Array(bufferLength);

    function draw() {
        requestAnimationFrame( draw );

        analyser.getFloatTimeDomainData(data);

        let amp = averagePower(data);
        ampBuffer.write(amp);
        render();
    }

    draw();
}

function render() {

    camera.position.x += ( mouseX - camera.position.x ) * .05;
    camera.position.y += ( - mouseY - camera.position.y) * .05;
    camera.lookAt( scene.position );

    let positions = particles.geometry.attributes.position.array;
    let scales = particles.geometry.attributes.scale.array;

    let i = 0, j = 0;

    for ( let ix = 0; ix < AMOUNTX; ix ++ ) {

        for ( let iy = 0; iy < AMOUNTY; iy ++ ) {

            let amp = ampBuffer.read( 3 * (- Math.round(Math.sqrt(Math.pow(iy - (AMOUNTY / 2),2) + Math.pow(ix - (AMOUNTX / 2), 2)))));
            positions[ i + 1 ] = amp * 100;
            scales[ j ] = amp  * 300;

            i += 3;
            j ++;
        }
    }

    ampBuffer.incrementReadPointer();
    particles.geometry.attributes.position.needsUpdate = true;
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