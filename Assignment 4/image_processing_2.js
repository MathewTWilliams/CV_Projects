//
// Prof R CG lect 7, Image Processing
// Edited by Matt Williams
//

var gl; 
var program; 
var canvas; 
var aspect; 

var imageAspect; 

var dimAndKernelWeight = vec3(1241.0, 639.0, 16.0);
var kernel = mat3(); 
var filter = "normal"; 
var seg_thresh = -1;        // -1 means don't apply segmentation thresholding


var left = -2;              // left limit of world coords
var right = 2;              // right limit of world coords 
var bottom = -2;            // bottom limit of world coords
var topBound = 2;           // top limit of world coords
var near = -10;             // near clip plane
var far = 10;               // far clip plane


window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");      // Get HTML Canvas
    gl = canvas.getContext('webgl2');                   // Get a WebGL 2.0 context
    if( !gl ) { alert("WebGL isn't available"); }

    aspect = canvas.width / canvas.height;              // Get the aspect ratio of the canvas
    left *= aspect;                                     // new left limit of world coords
    right *= aspect;                                    // new right limit of world coords

    // Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader"); // Compile and link shaders to form a program
    gl.useProgram(program);                                         // Make this the active shader program

    //Set up texture
    var image = document.getElementById("texImage"); 
    configureTexture(image); 

    imageAspect = image.width / image.height; 

    dimAndKernelWeight[0] = image.width; 
    dimAndKernelWeight[1] = image.height; 

    // Vertices of two triangles
    var vertices = [
        vec2(-2.0 * imageAspect,  2.0), 
        vec2(-2.0 * imageAspect, -2.0), 
        vec2( 2.0 * imageAspect, -2.0),
        vec2(-2.0 * imageAspect,  2.0),
        vec2( 2.0 * imageAspect,  2.0), 
        vec2( 2.0 * imageAspect, -2.0)
    ];

    var texCoordsArray = [
        vec2(0.0, 1.0), 
        vec2(0.0, 0.0), 
        vec2(1.0, 0.0),
        vec2(0.0, 1.0), 
        vec2(1.0, 1.0),
        vec2(1.0, 0.0) 
    ]; 


    //
    // Configure WebGL
    //

    gl.viewport(0, 0, canvas.width, canvas.height);     // What part of the HTML we are looking at
    gl.clearColor( 0.0, 0.0, 0.0, 0.0);                 // Set background color of the viewport black

    // Texture attribute VBO
    var tBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer); 
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW); 

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord"); 
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0 , 0); 
    gl.enableVertexAttribArray(vTexCoord);
    
    // Load the data into the GPU

    var bufferId = gl.createBuffer();                                   // Generate a VBO
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);                           // Bind this VBO to be the active one
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);    // Load the VBO with vertex data


    // Associate our shader variables with our data buffer

    var vPosition = gl.getAttribLocation(program, "vPosition");         // Link js vPosition with "vertex shader attribute variable" - vPosition
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0 , 0); 
    gl.enableVertexAttribArray(vPosition); 

    render(); 
}

document.getElementById("Seg_Thresh").onchange = function() {
    if(event.srcElement.checked == true) {
        seg_thresh = 1; 
    }
    else {
        seg_thresh = -1; 
    }
}

var m = document.getElementById("mymenu"); 
m.addEventListener("click", function() {
    switch(m.selectedIndex) {
        case 0: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "normal"; 
            break;
        }
        case 1: { 
            dimAndKernelWeight[2] = 1.0;
            filter = "boxBlur";
            break;
        }
        case 2: { 
            dimAndKernelWeight[2] = 1.0; 
            filter = "triangleBlur"; 
            break;
        }
        case 3: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "fourNeighborEdge"; 
            break;
        }
        case 4: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "sharpenX2"; 
            break;
        }
        case 5: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "sharpenX8"; 
            break;
        }
        case 6: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "unsharpen_1"; 
            break;
        }
        case 7: {
            dimAndKernelWeight[2] = 8.0; 
            filter = "unsharpen_2"; 
            break;
        }
        case 8: {
            dimAndKernelWeight[2] = 16.0; 
            filter = "gaussian"; 
            break;
        }
        case 9: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "edge_detect_2"; 
            break;
        }

    }
});

// Callback function for keydown events, registers function dealWithKeyboard
window.addEventListener("keydown", dealWithKeyboard, false); 

function dealWithKeyboard(e) {
    switch (e.keyCode) {
        case 33: { // PageUp key, Zoom in
            var range = right - left; 
            var delta = (range - range * 0.9) * 0.5; 
            left += delta; 
            right -= delta; 
            range = topBound - bottom; 
            delta = (range - range * 0.9) * 0.5;
            topBound -= delta; 
            bottom += delta;
            break;
        }

        case 34: {  // PageDown key, Zoom out
            var range = right - left; 
            var delta = (range - range * 0.9) * 0.5; 
            left -= delta;
            right += delta; 
            range = topBound - bottom; 
            delta = (range - range * 0.9) * 0.5; 
            topBound += delta; 
            bottom -= delta; 
            break; 
        }

        case 37: {// left arrow pan left
            left += -0.1; 
            right += -0.1; 
            break; 
        }

        case 38: {// up arrow pan up
            bottom += 0.1; 
            topBound += 0.1; 
            break; 
        }

        case 39: {// right arrow pan right 
            left += 0.1; 
            right += 0.1; 
            break; 
        }

        case 40: { // down arrow pan down
            bottom += -0.1; 
            topBound += -0.1;
            break;  
        }
    }
}


function configureTexture(image) {
    texture = gl.createTexture(); 
    gl.bindTexture(gl.TEXTURE_2D, texture); 
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); 
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);



    gl.generateMipmap(gl.TEXTURE_2D); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);

}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);                          // Clear viewport with gl.clearColor defined above

    var PMat;                                               // js variable to hold projection matrix
    PMat = ortho(left, right, bottom, topBound, near, far); // Call function to compute orghographic project matrix
    
    var P_loc = gl.getUniformLocation(program, "P");        // Get Vertex shader memory location for P
    gl.uniformMatrix4fv(P_loc, false, flatten(PMat));       // Set uniform variable p on GPU


    // Get Uniform locations
    // Set CPU-side variables for all of our shader variables

    // Define several convolution kernels
    var kernels = {
        normal: [
          0, 0, 0,
          0, 1, 0,
          0, 0, 0
        ],
        boxBlur: [
            0.111, 0.111, 0.111,
            0.111, 0.111, 0.111,
            0.111, 0.111, 0.111
        ],
        triangleBlur: [
            0.0625, 0.125, 0.0625,
            0.125,  0.25,  0.125,
            0.0625, 0.125, 0.0625
        ], 
        fourNeighborEdge: [
            0, -1, 0, 
            -1, 4, -1, 
            0, -1, 0
        ], 
        sharpenX2: [
            0, -2, 0,
            -2, 9, -2,
            0, -2, 0
        ], 
        sharpenX8: [
            0, -8, 0,
            -8, 33, -8,
            0, -8, 0
        ],
        unsharpen_1: [
            -1, -1, -1,
            -1,  9, -1,
            -1, -1, -1
        ], 
        unsharpen_2: [
            -1, -1, -1,
            -1,  16, -1,
            -1, -1, -1
        ],
        gaussian: [
            1, 2, 1,
            2, 4, 2,
            1, 2, 1
        ], 
        edge_detect_2: [
            -1, -1, -1, 
            -1,  8, -1,
            -1, -1, -1 
        ]
      };

      var kernelLocation = gl.getUniformLocation(program, "kernel[0]"); 
      gl.uniform1fv(kernelLocation, kernels[filter]);

      var dimAndKernelWeightLoc = gl.getUniformLocation(program, "dimAndKernelWeight"); 
      gl.uniform3fv(dimAndKernelWeightLoc, dimAndKernelWeight); 

      var seg_thres_Loc = gl.getUniformLocation(program, "seg_thresh"); 
      gl.uniform1i(seg_thres_Loc, seg_thresh); 

      gl.drawArrays(gl.TRIANGLES, 0 , 6);       // Draw two triangles using the TRIANGLES primitive using 6 vertices
      requestAnimationFrame(render); 

}