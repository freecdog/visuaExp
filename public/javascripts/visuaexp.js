/**
 * Created by jaric on 16.09.13.
 */

(function($) {

    $.expholder = {};

    //  Models

    //  View

    var biggestHeight = "100%";

    $.expholder.ExpView = Backbone.View.extend({
        tagName: 'div',
        id: 'expHolder',

        initialize: function(){
            this.resize();
            this.render();
        },

        resize: function() {
            var size = this.getScreenSize();
            //var exp = this.$el;
            var exp = document.getElementById('expHolder');
            if (size.width > size.height) {
                //console.log("size", size);
                //console.log("exp1", exp);
                //exp.attr({left: "20%", top: "0%", width: "80%", height: biggestHeight});
                //console.log("exp2", exp);
                exp.style.left = "20%";
                exp.style.top = "0%";
                exp.style.width = "80%";
                exp.style.height = biggestHeight;
            } else {
                exp.style.left = "0%";
                exp.style.top = "20%";
                exp.style.width = "100%";
                exp.style.height = "80%";
            }
        },

        getScreenSize: function() {
            var winW = 555, winH = 333;
            if (document.body && document.body.offsetWidth) {
                winW = document.body.offsetWidth;
                winH = document.body.offsetHeight;
            }
            if (document.compatMode=='CSS1Compat' && document.documentElement && document.documentElement.offsetWidth ) {
                winW = document.documentElement.offsetWidth;
                winH = document.documentElement.offsetHeight;
            }
            if (window.innerWidth && window.innerHeight) {
                winW = window.innerWidth;
                winH = window.innerHeight;
            }
            return {width: winW, height: winH};
        },

        render: function() {
            var self = this;

            this.$el.empty();

            var shaderFSView = new $.expholder.ShaderFSView();
            this.$el.append( shaderFSView.render().el );

            var shaderVSView = new $.expholder.ShaderVSView();
            this.$el.append( shaderVSView.render().el );

            var explosionView = new $.expholder.ExplosionView({width: this.$el[0].clientWidth, height: this.$el[0].clientHeight});
            var renderedExplosionView = explosionView.render();
            this.$el.prepend( renderedExplosionView.$el );

            return this;
        }
    });

    $.expholder.ShaderFSView = Backbone.View.extend({
        tagName: "script",
        id: "shader-fs",

        initialize: function(){
            this.el.type = "x-shader/x-fragment";
        },

        render: function() {
            this.$el.empty();

            this.$el.append("precision mediump float;\n" +
                "varying vec4 vColor;\n" +
                "void main(void) {\n" +
                "gl_FragColor = vColor;\n" +
                "}");

            return this;
        }
    });
    $.expholder.ShaderVSView = Backbone.View.extend({
        tagName: "script",
        id: "shader-vs",

        initialize: function(){
            this.el.type = "x-shader/x-vertex";
        },

        render: function() {
            this.$el.empty();

            this.$el.append("attribute vec3 aVertexPosition;\n" +
                "attribute vec4 aVertexColor;\n" +
                "uniform mat4 uMVMatrix;\n" +
                "uniform mat4 uPMatrix;\n" +
                "varying vec4 vColor;\n" +
                "void main(void) {\n" +
                "gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n" +
                "vColor = aVertexColor;\n" +
                "}");

            return this;
        }
    });

    var gl;
    var shaderProgram;
    var mvMatrix = mat4.create();
    var pMatrix = mat4.create();
    var triangleVertexPositionBuffer;
    var triangleVertexColorBuffer;
    var squareVertexPositionBuffer;
    var squareVertexColorBuffer;


    $.expholder.ExplosionView = Backbone.View.extend({
        tagName: 'canvas',
        id: 'explosion',

        initialize: function(size){
            //this.el.setAttribute("width", size.width);
            //this.el.setAttribute("height", size.height);
            this.el.width = size.width;
            this.el.height = size.height;

            this.changeSize(this.el.width, this.el.height);

            this.listenTo(this, "changeSize", this.changeSize);
        },

        changeSize: function(width, height){
            //this.el.top = 0;
            //this.el.left = 256;
            this.el.width = width;
            if (!!height)
                this.el.height= height;
            else
                this.el.height = 400;
        },

        initGL: function(canvas){
            try {
                gl = canvas.getContext("experimental-webgl");
                gl.viewportWidth = canvas.width;
                gl.viewportHeight = canvas.height;
                //gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);   // don't work =( chapter 2.3 https://www.khronos.org/registry/webgl/specs/latest/1.0/
            } catch (e) {
                alert(JSON.stringify(e));
            }
            if (!gl) {
                alert("Could not initialise WebGL, sorry :-(");
            }
        },

        getShader: function(gl, id) {
            var shaderScript = document.getElementById(id);
            if (!shaderScript) {
                return null;
            }

            var str = "";
            var k = shaderScript.firstChild;
            while (k) {
                if (k.nodeType == 3) {
                    str += k.textContent;
                }
                k = k.nextSibling;
            }

            var shader;
            if (shaderScript.type == "x-shader/x-fragment") {
                shader = gl.createShader(gl.FRAGMENT_SHADER);
            } else if (shaderScript.type == "x-shader/x-vertex") {
                shader = gl.createShader(gl.VERTEX_SHADER);
            } else {
                return null;
            }

            gl.shaderSource(shader, str);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert(gl.getShaderInfoLog(shader));
                return null;
            }

            return shader;
        },

        initShaders: function() {
            var fragmentShader = this.getShader(gl, "shader-fs");
            var vertexShader = this.getShader(gl, "shader-vs");

            shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                alert("Could not initialise shaders");
            }

            gl.useProgram(shaderProgram);

            shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
            gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

            shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
            gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

            shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
            shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        },

        setMatrixUniforms: function() {
            gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
            gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
        },

        initBuffers: function() {
            triangleVertexPositionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
            var vertices = [
                0.0,  1.0,  0.0,
                -1.0, -1.0,  0.0,
                1.0, -1.0,  0.0
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            triangleVertexPositionBuffer.itemSize = 3;
            triangleVertexPositionBuffer.numItems = 3;

            triangleVertexColorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
            var colors = [
                1.0, 0.0, 0.0, 1.0,
                0.0, 1.0, 0.0, 1.0,
                0.0, 0.0, 1.0, 1.0
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
            triangleVertexColorBuffer.itemSize = 4;
            triangleVertexColorBuffer.numItems = 3;

            squareVertexPositionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
            vertices = [
                1.0,  1.0,  0.0,
                -1.0,  1.0,  0.0,
                1.0, -1.0,  0.0,
                -1.0, -1.0,  0.0
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            squareVertexPositionBuffer.itemSize = 3;
            squareVertexPositionBuffer.numItems = 4;

            squareVertexColorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
            colors = [];
            for (var i=0; i < 4; i++) {
                colors = colors.concat([i*0.25, 1-i*0.25, 0.75, 1.0]);
            }
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
            squareVertexColorBuffer.itemSize = 4;
            squareVertexColorBuffer.numItems = 4;
        },

        drawScene: function() {
            gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

            mat4.identity(mvMatrix);

            mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);
            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, triangleVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

            this.setMatrixUniforms();
            gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);


            mat4.translate(mvMatrix, [3.0, 0.0, 0.0]);
            gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

            this.setMatrixUniforms();
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
        },

        webGLStart: function(){
            var canvas = this.el;

            this.initGL(canvas);
            this.initShaders();
            this.initBuffers();

            gl.clearColor(0.9, 0.9, 0.9, 1.0);
            gl.enable(gl.DEPTH_TEST);

            this.drawScene();
        },

        render: function() {
            this.webGLStart();

            return this;
        }
    });

    $.expholder.InfoView = Backbone.View.extend({
        tagName: 'div',
        id: 'infoHolder',

        initialize: function(){

            this.resize();
            this.render();
        },

        resize: function() {
            var size = this.getScreenSize();
            var exp = document.getElementById('infoHolder');
            if (size.width > size.height) {
                $.expholder.horizontal = true;
                exp.style.left = "0%";
                exp.style.top = "0%";
                exp.style.width = "20%";
                exp.style.height = "100%";
            } else {
                $.expholder.horizontal = false;
                exp.style.left = "0%";
                exp.style.top = "0%";
                exp.style.width = "100%";
                exp.style.height = "20%";
            }
        },

        getScreenSize: function() {
            var winW = 555, winH = 333;
            if (document.body && document.body.offsetWidth) {
                winW = document.body.offsetWidth;
                winH = document.body.offsetHeight;
            }
            if (document.compatMode=='CSS1Compat' && document.documentElement && document.documentElement.offsetWidth ) {
                winW = document.documentElement.offsetWidth;
                winH = document.documentElement.offsetHeight;
            }
            if (window.innerWidth && window.innerHeight) {
                winW = window.innerWidth;
                winH = window.innerHeight;
            }
            return {width: winW, height: winH};
        },

        todoTemplate: _.template("<div id='ToDoList'>ToDo:<li>" +
            "openGL draw</li><li>" +
            "input reader</li><li>" +
            "Absolute position to Canvas, seems like it is higher than window</li><li>" +
            "fonts</li>" +
            "</div>"
        ),
        doneTemplate: _.template("<div id='DoneList'>Done:<li>" +
            "Scrollbars are hidden now, but it's absolute position (2013.11.07 11:35)</li><li>" +
            "Low quality with default width and height (2013.11.05 10:00)</li>" +
            "</div>"
        ),

        render: function() {
            var self = this;

            this.$el.empty();

            var table = $('<table/>');
            var elements = [];
            elements.push("<div id='renderTime'>Time left: " + $.expholder.renderTime + " ms</div>");
            elements.push(this.todoTemplate());
            elements.push(this.doneTemplate());

            if ($.expholder.horizontal) {
                for (var i = 0; i < elements.length; i++) {
                    table.append("<tr><td>"+ elements[i] + "</td></tr>");
                }
            } else {
                table.append("<tr>");
                for (var i = 0; i < elements.length; i++) {
                    table.append("<td>"+ elements[i] + "</td>");
                }
                table.append("</tr>");
            }
            this.$el.append(table);

            return this;
        }
    });

    //  Router

    $.expholder.Router = Backbone.Router.extend({
        routes: {
            "": "visualize"
        },

        visualize: function() {
            $.expholder.recievedTime = new Date();
            $.expholder.renderTime = $.expholder.recievedTime - $.expholder.deliveredTime;

            console.log("expView and infoView are hidden");
            $.expholder.expView = new $.expholder.ExpView({el: $('#expHolder')});
            $.expholder.infoView = new $.expholder.InfoView({el: $('#infoHolder')});

            //$(window).resize(function(){ $.expholder.expView.resize(); $.expholder.infoView.resize(); });
        }
    });

    //  App

    $.expholder.app = null;

    $.expholder.bootstrap = function() {
        $.expholder.app = new $.expholder.Router();
        Backbone.history.start({pushState: true});
    };

})(jQuery);