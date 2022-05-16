// Matt Williams
var file_image = document.getElementById("file_image");
var template_image = document.getElementById("template_image"); 
var file_input = document.getElementById("fileInput");
var template_input = document.getElementById("templateInput");
var matching_button = document.getElementById("Toggle_Matching"); 
var opencv_ouput = document.getElementById("opencv_output"); 

const MULTI_TEMPL_THRESHOLD = 0.95;

file_input.addEventListener('change', (e) =>{
    file_image.src = URL.createObjectURL(e.target.files[0]);
}, false);

template_input.addEventListener('change', (e) => {
    template_image.src = URL.createObjectURL(e.target.files[0]);
}, false);

matching_button.onclick = function() {

    //singleTemplateMatch()
    multiTemplateMatch()
    

}


function singleTemplateMatch() {
    // load in images and make dst and mask matrices
    let src = cv.imread(file_image); 
    let templ = cv.imread(template_image); 
    let dst = new cv.Mat(); 
    let mask = new cv.Mat();

    //performs template matching
    //params
    //src -> source image
    //templ -> template image
    //dst -> Contains map of comparison resuls of size (W-w+1) x (H-h+1)
    //cv.TM_CCOEFF -> specifies comparison method to use. 
    //mask -> mask of searched template. only needed for TM_SQDIFF and TM_CCORR_NORMED
    cv.matchTemplate(src, templ, dst, cv.TM_CCOEFF, mask);  
    //Finds the global minimum and maximum in the supplied array
    //params
    // dst -> single channel array to look for min and maxes
    // mask -> optional mask used to select a sub array
    // also contains parameters that that returns pointers to returned values
    let result = cv.minMaxLoc(dst, mask); 
    let maxPoint = result.maxLoc; 
    let color = new cv.Scalar(255, 0, 0, 255); 
    let point = new cv.Point(maxPoint.x + templ.cols, maxPoint.y + templ.rows); 
    // draws a rectangle on the source image given two vertices of the rectangle
    // that are on opposite corners of the rectangle. 
    cv.rectangle(src, maxPoint, point, color, 2, cv.LINE_8, 0); 
    cv.imshow(opencv_ouput, src); 
    src.delete(); dst.delete(); mask.delete(); templ.delete()

}


function multiTemplateMatch() {
    // load in images and make dst and mask matrices
    let src = cv.imread(file_image); 
    let templ = cv.imread(template_image); 
    let dst = new cv.Mat(); 
    let mask = new cv.Mat();
    let color = new cv.Scalar(0, 255, 0, 255);
    let count = 0;
    cv.matchTemplate(src, templ, dst, cv.TM_CCOEFF_NORMED, mask);
    let result = cv.minMaxLoc(dst, mask);
    let max_val = result.maxVal;
    console.log(max_val);
    

    while (max_val > MULTI_TEMPL_THRESHOLD) {
         
        let maxPoint = result.maxLoc; 
        let point = new cv.Point(maxPoint.x + templ.cols, maxPoint.y + templ.rows);
        cv.rectangle(src, maxPoint, point, color, 1, cv.LINE_8, 0);
        console.log(max_val);

        cv.matchTemplate(src, templ, dst, cv.TM_CCOEFF_NORMED, mask);
        result = cv.minMaxLoc(dst, mask);
        max_val = result.maxVal;
        count += 1; 
        if(count > 5) {
            break; 
        }

    }

    cv.imshow(opencv_ouput, src); 
    src.delete(); templ.delete(); dst.delete(); mask.delete(); 
}