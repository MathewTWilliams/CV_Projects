// Prof R CV lect 6, Image Processing
// Edited by Matt Williams

var gl; 
var program; 
var canvas; 
var aspect; 

var warmth = 0.0;
var brightness = 0.0; 
var invert = 1;                 // if invert is 1, then don't invert
var contrast = 1.0;             // contrast multiplier
var nl_contrast = 1.0;          // nl_contrast exponent
var is_color = 1;               // if is_color is 1, show colored picture
var smooth = -1;              // -1 means smoothing filtering is off

var left = -2;                  //left limit of world coords
var right = 2;                  //right limit of world coords
var bottom = -2;                //bottom limit of world coords
var topBound = 2;               //top limit of world coords
var near = -10;                 //near clip plane
var far = 10;                   //far clip plane




window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");  // Get HTML canvas

    gl = canvas.getContext('webgl2');               //Get a WebGL 2.0 context
    if ( !gl ) {alert("WebGL isn't available");}

    aspect = canvas.width / canvas.height;    // Get aspect ratio
    left *= aspect; 
    right *= aspect; 



    // Vertices of two triangles 
    //1.942 is the aspect ratio of the photo
    var vertices = [
        vec2(-2.0 * 1.942, 2.0),
        vec2(-2.0 * 1.942,-2.0),
        vec2( 2.0 * 1.942,-2.0),
        vec2(-2.0 * 1.942, 2.0),
        vec2( 2.0 * 1.942, 2.0),
        vec2( 2.0 * 1.942,-2.0)
    ];

    //texture coordinates
    var texCoordsArray = [
        vec2(0.0, 1.0),
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(1.0, 1.0),
        vec2(1.0, 0.0)
    ];

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);  // What part of the html are we looking at? 
    gl.clearColor(0.0, 0.0, 0.0, 1.0);               // Set background color of the viewport to black

    //Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader"); // Compile and link shaders to form a program
    gl.useProgram(program);                                        // Make this the active shader program


    // Texture attribute VBO
    var tBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer); 
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord"); 
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0); 
    gl.enableVertexAttribArray(vTexCoord); 

    // Load the data into the GPU
    var bufferId = gl.createBuffer();                                   // Generate a VBO id
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);                           // Bind this VBO to the active one
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);  // Load the VBO with vertex data

    // Associate our shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");         // Link js vPosition with "vertex shader attribute variable" - vPosition
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0); 
    gl.enableVertexAttribArray(vPosition); 

    // Set up texture
    var image = document.getElementById("texImage"); 

    configureTexture(image); 
    render();

};


window.addEventListener("keydown", dealWithKeyboard, false); 

function dealWithKeyboard(e) {
    switch(e.keyCode) {

        case 33: // PageUp key , Zoom in
            {
                var range = (right - left);
                var delta = (range - range * 0.9) * 0.5;
                left += delta; right -= delta;
                range = topBound - bottom;
                delta = (range - range * 0.9) * 0.5;
                bottom += delta; topBound -= delta;
            }
            break;
        case 34: // PageDown key, zoom out
            {
                var range = (right - left);
                var delta = (range * 1.1 - range) * 0.5;
                left -= delta; right += delta;
                range = topBound - bottom;
                delta = (range * 1.1 - range) * 0.5;
                bottom -= delta; topBound += delta;
            }
            break;
        case 37: // left arrow pan left
            {left += -0.1; right += -0.1;};
            break;
        case 38: // up arrow pan left
            {bottom += 0.1; topBound += 0.1;};
            break;
        case 39: // right arrow pan left
            {left += 0.1; right += 0.1;};
            break;
        case 40: // down arrow pan left
            {bottom += -0.1; topBound += -0.1;};
            break;

    }
}


document.getElementById("Warmth").oninput = function () {
    warmth = (event.srcElement.value / 128) * 0.5;
    
};


document.getElementById("Brightness").oninput = function () {
    brightness = (event.srcElement.value / 128) * 0.5; 
     
};

document.getElementById("Invert").onchange = function () {
     if(event.srcElement.checked == true) {
         invert = -1; 
     }

     else{
         invert = 1; 
     }
     
};

document.getElementById("Smooth").onchange = function () {
    if(event.srcElement.checked == true){
        smooth = 1; 
    } 
    else 
    {
        smooth = -1; 
    }
}

document.getElementById("Contrast").oninput = function () {
    contrast = event.srcElement.value; 
     
};

document.getElementById("NL_Contrast").oninput = function () {
    nl_contrast = event.srcElement.value; 
     
};

document.getElementById("Toggle_Color").onclick = function () {
    is_color *= -1; 
  
    
};


//Call back functions for our buttons for Minification
document.getElementById("Mini_Nearest").onclick = function() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    change_current_text("Mini", "Nearest-neighbor"); 
}

document.getElementById("Mini_Linear").onclick = function() {

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    change_current_text("Mini", "Linear Interpolation"); 
}

document.getElementById("Mini_Mip_Nearest").onclick = function() {

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    change_current_text("Mini", "Nearest-neighbor mipmapped"); 
}


document.getElementById("Mini_Mip_Linear").onclick = function() {

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    change_current_text("Mini", "Linear interpolation mipmaps"); 
}


//Call back functions for our buttons for  Magnification
document.getElementById("Mag_Nearest").onclick = function() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    change_current_text("Mag", "Nearest-neighbor"); 
}


document.getElementById("Mag_Linear").onclick = function() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    change_current_text("Mag", "Linear Interpolation"); 
}

function change_current_text(min_or_mag, chosen_option)
{
    document.getElementById( min_or_mag + "_Current").innerHTML = "Currently chosen: " + chosen_option; 
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);                  //Clear viewport with gl.clearColor defined above

    var PMat;                                       // js variable to hold projection matrix
    PMat = ortho(left, right, bottom, topBound, near, far); 
    var P_loc = gl.getUniformLocation(program, "P");
    gl.uniformMatrix4fv(P_loc, false, flatten(PMat)); 

    var brightnessLoc = gl.getUniformLocation(program, 'brightness'); 
    var warmthLoc = gl.getUniformLocation(program, "warmth"); 
    var invertLoc = gl.getUniformLocation(program, "invert");
    var contrastLoc = gl.getUniformLocation(program, "contrast");
    var nl_contrastLoc = gl.getUniformLocation(program, 'nl_contrast'); 
    var is_colorLoc = gl.getUniformLocation(program, "is_color"); 
    var smoothLoc = gl.getUniformLocation(program, "smoothing"); 

    // Get uniform locations
    gl.uniform1f(brightnessLoc, brightness);
    gl.uniform1f(warmthLoc, warmth);
    gl.uniform1i(invertLoc, invert);
    gl.uniform1f(contrastLoc, contrast); 
    gl.uniform1f(nl_contrastLoc, nl_contrast); 
    gl.uniform1i(is_colorLoc, is_color);
    gl.uniform1i(smoothLoc, smooth);    


    gl.drawArrays(gl.TRIANGLES, 0, 6);              //Draw two triangles using the TRIANGLES primitive using 6 vertices

    requestAnimationFrame(render); 

}



function configureTexture(image) {
    texture = gl.createTexture(); 
    gl.bindTexture(gl.TEXTURE_2D, texture); 
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); 
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); 

    gl.generateMipmap(gl.TEXTURE_2D); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); 

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0); 
}