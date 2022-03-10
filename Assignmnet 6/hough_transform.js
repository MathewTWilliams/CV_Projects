// Author: Prof R, Edited by Matt Williams

//const cv = require("./opencv");

/** Global Variables */
var gl; 
var program; 
var canvas; 
var aspect; 

var imageAspect; 
var image = document.getElementById("texImage")

var dimAndKernelWeight = vec3(1241.0, 639.0, 16.0);
var filter = "normal"; 
var seg_thresh = -1;        // -1 means don't apply segmentation thresholding
var is_color = 1;            // 1 means apply color

var left = -2;              // left limit of world coords
var right = 2;              // right limit of world coords 
var bottom = -2;            // bottom limit of world coords
var topBound = 2;           // top limit of world coords
var near = -10;             // near clip plane
var far = 10;               // far clip plane

var is_streaming = false; 
const FPS = 30; 
var video = document.getElementById('videoInput');  
var video_src; 
var video_dst; 
var cap; 
var opencv_filter = "normal";

/** When our HTML window loads, initialize WebGL */
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

    bufferId = gl.createBuffer();                                   // Generate a VBO
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);                           // Bind this VBO to be the active one
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);    // Load the VBO with vertex data


    // Associate our shader variables with our data buffer

    var vPosition = gl.getAttribLocation(program, "vPosition");         // Link js vPosition with "vertex shader attribute variable" - vPosition
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0 , 0); 
    gl.enableVertexAttribArray(vPosition); 
 
    render(); 
};

/** Connect to our webcam. */
function initVideo(){  
    cap = new cv.VideoCapture(video);
    navigator.mediaDevices.getUserMedia({video:true, audio:false})
        .then(function(stream) {
            video.srcObject = stream; 
            video.play(); 
        })
        .catch(function(err){
            console.log("An error occurred! " + err); 
        });
}

/** Reads in input from webcam and performs the chosen algorithm  */
function processVideo() {
    try{
        if(!is_streaming) {
            //stop
            cv_update_image(); 
            return; 
        } 
        let begin = Date.now(); 
        //start processing
        video_src = cv.Mat.zeros(video.height, video.width, cv.CV_8UC4); 
        video_dst = cv.Mat.zeros(video.height, video.width, cv.CV_8UC1);
        cap.read(video_src); 

        switch (opencv_filter) {
            case "normal": {
                cv.cvtColor(video_src, video_dst, cv.COLOR_RGBA2GRAY); 
                break; 
            }
            case "canny": {
                
                video_dst = open_cv_canny(video_src, video_dst); 
                break;
            }
            case "hough_lines": {
                video_dst = open_cv_hough_lines(video_src, video_dst); 
                break;
            }
            case "hough_circles" : {
                video_dst = open_cv_hough_circles(video_src, video_dst); 
                break;
            }
        }
        cv.imshow('opencv_output', video_dst); 
        // schedule next one
        let delay = 1000/FPS - (Date.now() - begin);
        video_src.delete(); 
        video_dst.delete(); 
        setTimeout(processVideo, delay);
    } catch(err) {
        console.log(err);  
    }
}


document.getElementById("Seg_Thresh").onchange = function() {
    if(event.srcElement.checked == true) {
        seg_thresh = 1; 
    }
    else {
        seg_thresh = -1; 
    }
};

document.getElementById("Toggle_Color").onchange = function() {
    if(event.srcElement.checked == true){
        is_color = -1; 
    }
    else {
        is_color = 1; 
    }
};

document.getElementById("Toggle_Video").onchange = function() {
    if(event.srcElement.checked == true){
        is_streaming = true; 
        initVideo();
        setTimeout(processVideo, 0);
    }
    else {
        is_streaming = false; 
    }
};

document.getElementById("fileInput").addEventListener('change', (e) => {
    image.src = URL.createObjectURL(e.target.files[0]); 
}, false);

image.onload = function () { 

    imageAspect = image.width / image.height; 
    dimAndKernelWeight[0] = image.width; 
    dimAndKernelWeight[1] = image.height; 

    if(gl){
        configureTexture(image);
    } 

    /* Vertices of two triangles
    var vertices = [
        vec2(-2.0 * imageAspect,  2.0), 
        vec2(-2.0 * imageAspect, -2.0), 
        vec2( 2.0 * imageAspect, -2.0),
        vec2(-2.0 * imageAspect,  2.0),
        vec2( 2.0 * imageAspect,  2.0), 
        vec2( 2.0 * imageAspect, -2.0)
    ];
    
     bufferId = gl.createBuffer();                                  
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);                           
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);    
    */


    if(!is_streaming && cv != null) {
        let src = cv.imread(image); 
        cv.imshow('opencv_output', src); 
        src.delete(); 
    }

};


document.getElementById("webgl_menu").addEventListener("click", function() {
    switch(m.selectedIndex) {
        case 0: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "normal"; 
            break;
        }
        case 1: { 
            dimAndKernelWeight[2] = 1.0;
            filter = "boxBlur_3x3";
            break;
        }
        case 2: { 
            dimAndKernelWeight[2] = 1.0; 
            filter = "box_blur_5x5"; 
            break;
        }
        case 3: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "triangleBlur"; 
            break;
        }
        case 4: {
            dimAndKernelWeight[2] = 159.0; 
            filter = "gaussian_blur_5x5_1"; 
            break;
        }
        case 5: {
            dimAndKernelWeight[2] = 273.0; 
            filter = "gaussian_blur_5x5_2"; 
            break;
        }
        case 6: {
            dimAndKernelWeight[2] = 571.0; 
            filter = "gaussian_blur_5x5_3"; 
            break;
        }
        case 7: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "sharpenX2"; 
            break;
        }
        case 8: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "sharpenX8"; 
            break;
        }
        case 9: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "unsharpen_1_3x3"; 
            break;
        }
        case 10: {
            dimAndKernelWeight[2] = 8.0; 
            filter = "unsharpen_2"; 
            break;
        }
        case 11: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "unsharpen_1_5x5"; 
            break;
        }
        case 12: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "emboss_edge"; 
            break;
        }
        case 13: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "laplacian_edge_1"; 
            break;
        }
        case 14: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "laplacian_edge_2";
            break;
        }
        case 15: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "laplacian_edge_2_5x5"; 
            break;
        }

        case 16: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "sobel_edge_right"; 
            break;
        }

        case 17: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "sobel_edge_top"; 
            break;
        }

        case 18: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "sobel_edge_left"; 
            break;
        }

        case 19: {
            dimAndKernelWeight[2] = 1.0; 
            filter = "sobel_edge_bottom";
            break;
        }

        case 20: {
            dimAndKernelWeight[2] = 1.0;
            filter = "prewitt_edge_right"
            break;
        }

        case 21: {
            dimAndKernelWeight[2] = 1.0;
            filter = "prewitt_edge_top"
            break;
        }

        case 22: {
            dimAndKernelWeight[2] = 1.0;
            filter = "prewitt_edge_left"
            break;
        }

        case 23: {
            dimAndKernelWeight[2] = 1.0;
            filter = "prewitt_edge_bottom"
            break;
        }

    }
});

var n = document.getElementById("opencv_menu"); 
n.addEventListener("click", function() {
    switch(n.selectedIndex) {

        case 0: {
            opencv_filter = "normal";  
            break; 
        }

        case 1: {
            opencv_filter = "canny"; 
            break; 
        }

        case 2: {
            opencv_filter = "hough_lines"; 
            break;
        }

        case 3: {
            opencv_filter = "hough_circles";
            break;
        }
    }

    cv_update_image(); 
    
}); 

function cv_update_image() {
    if(is_streaming){
        return;  
    }

    let src = cv.imread(image); 

    switch(opencv_filter) {
        case "normal": {
            cv.imshow("opencv_output", src); 
            break;
        }

        case "canny": {
            let dst = new cv.Mat(); 
            dst = open_cv_canny(src, dst); 
            cv.imshow("opencv_output", dst); 
            dst.delete();
            break; 
        }

        case "hough_lines": {
            let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
            dst = open_cv_hough_lines(src, dst); 
            cv.imshow("opencv_output", dst);  
            dst.delete(); 
            break; 
        }

        case "hough_circles": {
            let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1); 
            dst = open_cv_hough_circles(src, dst); 
            cv.imshow("opencv_output", dst); 
            dst.delete();  
            break; 
        }
    }

    src.delete(); 
}

function open_cv_canny(src, dst) { 

    cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0); 
    cv.Canny(src, dst, 50, 100, 5, false); 
    return dst; 
}

function open_cv_hough_lines(src, dst) {
 
    let lines = new cv.Mat(); 
    let color = new cv.Scalar(200, 200, 200); 

    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0) // B&W
    cv.Canny(src, src, 50, 200, 3); // Edges via gradients
    cv.HoughLinesP(src, lines, 1, Math.PI/180, 2, 0, 0);
    //draw lines
    for(let i = 0; i < lines.rows; i++) {
        let startPoint = new cv.Point(lines.data32S[i*4], lines.data32S[i*4+1]); 
        let endPoint = new cv.Point(lines.data32S[i*4 + 2], lines.data32S[i*4+3]); 
        cv.line(dst, startPoint, endPoint, color);
    }

    lines.delete(); 
    return dst; 

}

function open_cv_hough_circles(src, dst) {

    let circles = new cv.Mat(); 
    let color = new cv.Scalar(255, 0, 0); 
    
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0); 
    cv.HoughCircles(src, circles, cv.HOUGH_GRADIENT, 1, 45, 75, 40, 0, 0); 

    for(let i = 0; i < circles.cols; i++) {
        let x = circles.data32F[i*3]; 
        let y = circles.data32F[i * 3 + 1]; 
        let radius = circles.data32F[i * 3 + 2]; 
        let center = new cv.Point(x,y); 
        cv.circle(dst, center, radius, color); 

    }

    circles.delete(); 
    return dst; 
}

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
};

/** Prepare texture to be used by WebGL */
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



// Define several convolution kernels
var kernels = {
    normal: [
      0, 0, 0, 0, 0, 
      0, 0, 0, 0, 0,
      0, 0, 1, 0, 0, 
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0
    ],
    boxBlur_3x3: [ // Lowpass filter
        0,     0,     0,     0, 0,
        0, 0.111, 0.111, 0.111, 0,
        0, 0.111, 0.111, 0.111, 0,
        0, 0.111, 0.111, 0.111, 0,
        0,     0,     0,     0, 0
    ],
    triangleBlur: [ // Gaussian Filter
        0,      0,     0,      0, 0,
        0, 0.0625, 0.125, 0.0625, 0,
        0,  0.125,  0.25,  0.125,  0, 
        0, 0.0625, 0.125, 0.0625, 0,
        0,      0,     0,      0, 0
    ], 
    laplacian_edge_1: [ //Laplacian Edge 1
        0,  0,  0,  0, 0,
        0,  0, -1,  0, 0,
        0, -1,  4, -1, 0,
        0,  0, -1,  0, 0, 
        0,  0,  0,  0, 0
    ], 
    sharpenX2: [    // Sharpening from homework
        0,  0,  0,  0, 0, 
        0,  0, -2,  0, 0, 
        0, -2,  9, -2, 0, 
        0,  0, -2,  0, 0, 
        0,  0,  0,  0, 0
    ], 
    sharpenX8: [    // Sharpening from homework
        0,  0,  0,  0, 0,
        0,  0, -8,  0, 0,
        0, -8, 33, -8, 0, 
        0,  0, -8,  0, 0,  
        0,  0,  0,  0, 0
    ],
    unsharpen_1_3x3: [ // Unsharpening from homework
        0,  0,  0,  0, 0, 
        0, -1, -1, -1, 0, 
        0, -1,  9, -1, 0,
        0, -1, -1, -1, 0, 
        0,  0,  0,  0, 0
    ], 
    unsharpen_2: [ // Unsharpening from hoemwork
        0,  0,  0,  0, 0, 
        0, -1, -1, -1, 0,
        0, -1, 16, -1, 0,
        0, -1, -1, -1, 0, 
        0,  0,  0,  0, 0
    ],
    laplacian_edge_2: [ // High pass filter
        0,  0,  0,  0, 0,
        0, -1, -1, -1, 0,
        0, -1,  8, -1, 0, 
        0, -1, -1, -1, 0,
        0,  0,  0,  0, 0 
    ], 
    emboss_edge: [ 
        0,  0,  0,  0, 0,
        0, -2, -1, 0, 0,
        0, -1,  1, 1, 0, 
        0,  0,  1, 2, 0,
        0,  0,  0,  0, 0 
    ],
    sobel_edge_right: [ // From homework
        0,  0, 0, 0, 0, 
        0, -1, 0, 1, 0,
        0, -2, 0, 2, 0,
        0, -1, 0, 1, 0,
        0,  0, 0, 0, 0
    ], 
    sobel_edge_top: [ // From homework
         0,  0,  0,  0, 0, 
         0,  1,  2,  1, 0, 
         0,  0,  0,  0, 0, 
         0, -1, -2, -1, 0, 
         0,  0,  0,  0, 0
    ], 
    sobel_edge_left: [ // From homework
        0, 0, 0,  0, 0, 
        0, 1, 0, -1, 0,
        0, 2, 0, -2, 0,
        0, 1, 0, -1, 0,
        0, 0, 0,  0, 0
    ], 
    sobel_edge_bottom: [ // From homework
         0,  0,  0,  0, 0, 
         0, -1, -2, -1, 0, 
         0,  0,  0,  0, 0, 
         0,  1,  2,  1, 0, 
         0,  0,  0,  0, 0
    ], 
    gaussian_blur_5x5_1: [ // 5x5 Gaussian Blur from slides
        2,  4,  5,  4, 2, 
        4,  9, 12,  9, 4, 
        5, 12, 15, 12, 5, 
        4,  9, 12,  9, 4, 
        2,  4,  5,  4, 2
    ], 

    gaussian_blur_5x5_2: [ // traditional 5x5 Gaussian Blur
        1,  4,  7,  4, 1,
        4, 16, 26, 16, 4,
        7, 26, 41, 26, 7, 
        4, 16, 26, 16, 4, 
        1,  4,  7,  4, 1
    ], 

    gaussian_blur_5x5_3: [
         2,  7,  12,  7,  2,
         7, 31,  52, 31,  7, 
        12, 52, 127, 52, 12,
         7, 31,  52, 31,  7, 
         2,  7,  12,  7,  2
    ],

    box_blur_5x5 : [ // 5x5 Low pass filter
        0.04, 0.04, 0.04, 0.04, 0.04,
        0.04, 0.04, 0.04, 0.04, 0.04,
        0.04, 0.04, 0.04, 0.04, 0.04,
        0.04, 0.04, 0.04, 0.04, 0.04, 
        0.04, 0.04, 0.04, 0.04, 0.04
    ],

    unsharpen_1_5x5: [ // 5x5 Hipass filter
        -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1,
        -1, -1, 24, -1, -1,
        -1, -1, -1, -1, -1, 
        -1, -1, -1, -1, -1,
    ], 

    laplacian_edge_2_5x5: [
        -1, -3, -4, -3, -1, 
        -3,  0,  6,  0, -3, 
        -4,  6, 20,  6, -4, 
        -3,  0,  6,  0, -3,
        -1, -3, -4, -3, -1, 

    ], 

    prewitt_edge_right: [
        0,  0, 0, 0, 0, 
        0, -1, 0, 1, 0,
        0, -1, 0, 1, 0,
        0, -1, 0, 1, 0,
        0,  0, 0, 0, 0,
    ], 

    prewitt_edge_top: [
        0,  0,  0,  0, 0, 
        0,  1,  1,  1, 0,
        0,  0,  0,  0, 0,
        0, -1, -1, -1, 0,
        0,  0,  0,  0, 0,
    ], 

    prewitt_edge_left: [
        0, 0, 0,  0, 0, 
        0, 1, 0, -1, 0,
        0, 1, 0, -1, 0,
        0, 1, 0, -1, 0,
        0, 0, 0,  0, 0,
    ], 

    prewitt_edge_bottom: [
        0,  0,  0,  0, 0, 
        0, -1, -1, -1, 0,
        0,  0,  0,  0, 0,
        0,  1,  1,  1, 0,
        0,  0,  0,  0, 0,
    ], 
  };

/** Main Function */
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);                          // Clear viewport with gl.clearColor defined above

    var PMat;                                               // js variable to hold projection matrix
    PMat = ortho(left, right, bottom, topBound, near, far); // Call function to compute orghographic project matrix
    
    var P_loc = gl.getUniformLocation(program, "P");        // Get Vertex shader memory location for P
    gl.uniformMatrix4fv(P_loc, false, flatten(PMat));       // Set uniform variable p on GPU


    // Get Uniform locations
    // Set CPU-side variables for all of our shader variables

      var kernelLocation = gl.getUniformLocation(program, "kernel[0]"); 
      gl.uniform1fv(kernelLocation, kernels[filter]);

      var dimAndKernelWeightLoc = gl.getUniformLocation(program, "dimAndKernelWeight"); 
      gl.uniform3fv(dimAndKernelWeightLoc, dimAndKernelWeight); 

      var seg_thres_Loc = gl.getUniformLocation(program, "seg_thresh"); 
      gl.uniform1i(seg_thres_Loc, seg_thresh); 

      var is_color_Loc = gl.getUniformLocation(program, "is_color"); 
      gl.uniform1i(is_color_Loc, is_color);

      gl.drawArrays(gl.TRIANGLES, 0 , 6);       // Draw two triangles using the TRIANGLES primitive using 6 vertices
      requestAnimationFrame(render); 

}