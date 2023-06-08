'use strict';

let gl;                         // The webgl context.
let surface;                   // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let li = 30;
let tex, video, track, triangles;
let top1, bottom, left, right, near, far;

function deg2rad(angle) {
  return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iNormalBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  }

  this.NormalBufferData = function(normals) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

    this.count = normals.length / 3;
  }
  this.TextureBufferData = function(textures) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);
  }

  this.Draw = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribNormal);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    gl.uniform4fv(shProgram.iColor, [1., 0.8, 0.0, 1]);
    gl.lineWidth(1);
    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
  }
  this.DrawTriangles = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }
}


// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  this.iAttribNormal = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;
  this.iNormalMatrix = -1;
  this.lightPosLoc = -1;

  this.Use = function() {
    gl.useProgram(this.prog);
  }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
let conv, // convergence
  eyes, // eye separation
  ratio, // aspect ratio
  fov; // field of view
let a1, b, c;
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  let projection = m4.perspective(Math.PI / 32, 1, 8, 12);

  calcCamParameters();

  applyLeftFrustrum();

  let projectionLeft = m4.frustum(left, right, bottom, top1, near, far);

  applyRightFrustrum();

  let projectionRight = m4.frustum(left, right, bottom, top1, near, far);
  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();
  // let modelView = getRotationMatrix()
  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
  let translateToPointZero = m4.translation(0, 0, -10);
  let translateToLeft = m4.translation(-0.03, 0, -10);
  let translateToRight = m4.translation(0.03, 0, -10);

  // let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum0 = m4.multiply(m4.multiply(rotateToPointZero, modelView), getRotationMatrix());
  // window.alert(getRotationMatrix())
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  let matAccumLeft = m4.multiply(translateToLeft, matAccum0);
  let matAccumRight = m4.multiply(translateToRight, matAccum0);

  /* Multiply the projection matrix times the modelview matrix to give the
     combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  // gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

  let modelviewInv = new Float32Array(16);
  let normalmatrix = new Float32Array(16);
  mat4Invert(modelViewProjection, modelviewInv);
  mat4Transpose(modelviewInv, normalmatrix);

  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalmatrix);

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform1i(shProgram.iTMU, 0);
  gl.uniform4fv(shProgram.iColor, [0.1, 1, 1, 1]);
  let matStill = m4.multiply(rotateToPointZero, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  let matAccumStill = m4.multiply(translateToPointZero, matStill);
  let translateWebCam = m4.translation(-1, -1, 0);
  let matAccumStill1 = m4.multiply(translateWebCam, matAccumStill);

  // gl.uniformMatrix4fv(shProgram.iModelmodelViewProjection = m4.multiply(projection, matAccumStill1);ViewMatrix, false, matStill);
  // gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, translateWebCam);
  // gl.bindTexture(gl.TEXTURE_2D, tex);
  // gl.texImage2D(
  //     gl.TEXTURE_2D,
  //     0,
  //     gl.RGBA,
  //     gl.RGBA,
  //     gl.UNSIGNED_BYTE,
  //     video
  // );
  // triangles.DrawTriangles();
  gl.uniform4fv(shProgram.iColor, [0, 0, 0, 1]);
  gl.uniform4fv(shProgram.iColor, [0.5, 0.3, 1.0, 1]);
  gl.uniform3fv(shProgram.lightPosLoc, [10 * Math.cos(Date.now() * 0.002), 10 * Math.sin(Date.now() * 0.002), 0]);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(true, false, false, false);
  surface.Draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(false, true, true, false);
  gl.uniform4fv(shProgram.iColor, [0.5, 0.3, 1.0, 1]);
  surface.Draw();

  gl.colorMask(true, true, true, true);
  window.requestAnimationFrame(draw)
}

function calcCamParameters() {
  let D = document;
  let spans = D.getElementsByClassName("slider-value");
  conv = 2000.0;
  conv = D.getElementById("conv").value;
  spans[3].innerHTML = conv;
  eyes = 70.0;
  eyes = D.getElementById("eyes").value;
  spans[0].innerHTML = eyes;
  ratio = 1.0;
  fov = Math.PI / 4;
  fov = D.getElementById("fov").value;
  spans[1].innerHTML = fov;

  near = 5.0;
  near = D.getElementById("near").value - 0.0;
  spans[2].innerHTML = near;
  far = 2000.0;

  top1 = near * Math.tan(fov / 2.0);
  bottom = -top1;

  a1 = ratio * Math.tan(fov / 2.0) * conv;

  b = a1 - eyes / 2;
  c = a1 + eyes / 2;

}

function applyLeftFrustrum() {
  left = -b * near / conv;
  right = c * near / conv;
}

function applyRightFrustrum() {
  left = -c * near / conv;
  right = b * near / conv;
}
const a = 0.5;
const p = 0.5;

function CreateSurfaceData(norms = false) {
  let vertexList = [];
  let normalsList = [];

  let z = -0.75;
  let b = 0;
  while (z <= 0.75) {
    while (b <= Math.PI * 2) {
      let v1 = revolParabola(z, b)
      let v2 = revolParabola(z + 0.1, b)
      let v3 = revolParabola(z, b + 0.2)
      let v4 = revolParabola(z + 0.1, b + 0.2);
      // one triangle
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      // another triangle
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
      let v21 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z }
      let v31 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z }
      let n1 = vec3Cross(v21, v31);
      vec3Normalize(n1);
      // normals for one 
      normalsList.push(n1.x, n1.y, n1.z);
      normalsList.push(n1.x, n1.y, n1.z);
      normalsList.push(n1.x, n1.y, n1.z);
      let v42 = { x: v4.x - v2.x, y: v4.y - v2.y, z: v4.z - v2.z };
      let v32 = { x: v3.x - v2.x, y: v3.y - v2.y, z: v3.z - v2.z };
      let n2 = vec3Cross(v42, v32);
      vec3Normalize(n2);
      // normals for anothers
      normalsList.push(n2.x, n2.y, n2.z);
      normalsList.push(n2.x, n2.y, n2.z);
      normalsList.push(n2.x, n2.y, n2.z);
      b += 0.2
    }
    b = 0
    z += 0.1;
  }

  if (norms) {
    return normalsList;
  }
  return vertexList;
}

function revolParabola(z, b) {
  let x = (a + z ** 2 / (2 * p)) * Math.cos(b);
  let y = (a + z ** 2 / (2 * p)) * Math.sin(b);
  return { x: x, y: y, z: z }
}


function vec3Cross(a, b) {
  let x = a.y * b.z - b.y * a.z;
  let y = a.z * b.x - b.z * a.x;
  let z = a.x * b.y - b.x * a.y;
  return { x: x, y: y, z: z }
}

function vec3Normalize(a) {
  var mag = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  a[0] /= mag; a[1] /= mag; a[2] /= mag;
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iTextureCoords = gl.getAttribLocation(prog, 'texture');
  shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
  shProgram.iColor = gl.getUniformLocation(prog, "color");
  shProgram.lightPosLoc = gl.getUniformLocation(prog, "light");

  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());
  surface.NormalBufferData(CreateSurfaceData(1));
  triangles = new Model('Triangles');
  triangles.BufferData([0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 2.0, 2.0, 0.0, 2.0, 2.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0]);
  triangles.TextureBufferData([0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1]);
  gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
let alpha, beta, gamma;
function createProgram(gl, vShader, fShader) {
  window.addEventListener('deviceorientation', e => {
    alpha = e.alpha / 180 * Math.PI;
    beta = e.beta / 180 * Math.PI;
    gamma = e.gamma / 180 * Math.PI;
  }, true);
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */

function init() {
  let canvas;
  try {
    // let resolution = Math.min(window.innerHeight, window.innerWidth);
    canvas = document.querySelector('canvas');
    gl = canvas.getContext("webgl");
    // canvas.width = 600;
    // canvas.height = 300;
    // gl.viewport(0, 0, 300, 300);
    // video = document.createElement('video');
    // video.setAttribute('autoplay', true);
    // window.vid = video;
    // getWebcam();
    // tex = CreateWebCamTexture();

    if (!gl) {
      throw "Browser does not support WebGL";
    }
  }
  catch (e) {
    document.querySelector("canvas").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  window.requestAnimationFrame(draw);
}

function mat4Transpose(a, transposed) {
  var t = 0;
  for (var i = 0; i < 4; ++i) {
    for (var j = 0; j < 4; ++j) {
      transposed[t++] = a[j * 4 + i];
    }
  }
}

function mat4Invert(m, inverse) {
  var inv = new Float32Array(16);
  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
    m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
    m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
    m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
    m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
    m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
    m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
    m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
    m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
    m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
    m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
    m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
    m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
    m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
    m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
    m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
    m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

  var det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (det == 0) return false;
  det = 1.0 / det;
  for (var i = 0; i < 16; i++) inverse[i] = inv[i] * det;
  return true;
}

function getWebcam() {
  navigator.getUserMedia({ video: true, audio: false }, function(stream) {
    video.srcObject = stream;
    track = stream.getTracks()[0];
  }, function(e) {
    console.error('Rejected!', e);
  });
}

function CreateWebCamTexture() {
  let textureID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textureID;
}

function getRotationMatrix() {
  var _x = -beta;
  var _y = -gamma;
  var _z = -alpha;

  var cX = Math.cos(_x);
  var cY = Math.cos(_y);
  var cZ = Math.cos(_z);
  var sX = Math.sin(_x);
  var sY = Math.sin(_y);
  var sZ = Math.sin(_z);

  //
  // ZXY rotation matrix construction.
  //

  var m11 = cZ * cY - sZ * sX * sY;
  var m12 = - cX * sZ;
  var m13 = cY * sZ * sX + cZ * sY;

  var m21 = cY * sZ + cZ * sX * sY;
  var m22 = cZ * cX;
  var m23 = sZ * sY - cZ * cY * sX;

  var m31 = - cX * sY;
  var m32 = sX;
  var m33 = cX * cY;

  return [
    m11, m12, m13, 0,
    m21, m22, m23, 0,
    m31, m32, m33, 0,
    0, 0, 0, 1
  ];

};