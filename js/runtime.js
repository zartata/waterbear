(function(global){
    'use strict';

    // Dependencies: ctx, canvas, Event, runtime, sound, soundEffect,
    // canvas/stage stuff
    var _canvas, _ctx;
    function canvas(){
        if (!_canvas){
            if (dom.find){
                _canvas = dom.find('canvas');
            }
            if (!_canvas){
                // We're not running in Waterbear
                // Just put a canvas in so tests pass
                _canvas = document.createElement('canvas');
                _canvas.setAttribute('width', '200');
                _canvas.setAttribute('height', '200');
            }
        }
        return _canvas;
    }

    function getContext(){
        if (!_ctx){
            _ctx = canvas().getContext('2d');
            // Save the default state.
            _ctx.save();
        }
        return _ctx;
    }
    function resetCanvas() {
        // No context to reset!
        if (!_ctx) {
            return;
        }

        var el = canvas();
        var ctx = getContext();
        ctx.clearRect(0, 0, el.width, el.height);
        // Restore the default state and push it back on the stack again.
        ctx.restore();
        ctx.save();
    }

    Event.on(window, 'ui:load', null, function(){
        handleResize();
    }, false);

    function handleResize(){
        if(dom.find('wb-playground > canvas')){ //only resize if the canvas is in the playground (and not the tutorial)
            var rect = canvas().getBoundingClientRect();
            Event.stage = {
                // FIXME: Move these to runtime.stage
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                bottom: Math.round(rect.bottom),
                width: Math.round(rect.right) - Math.round(rect.left),
                height: Math.round(rect.bottom) - Math.round(rect.top)
            };
            canvas().setAttribute('width', Event.stage.width);
            canvas().setAttribute('height', Event.stage.height);
        }
    }

    function canvasRect(){
        return new util.Rect(0,0,Event.stage.width,Event.stage.height);
    }

    function clearRuntime() {
        /* FIXME: Event.clearRuntime() should be moved to runtime.js.
         * See: https://github.com/waterbearlang/waterbear/issues/968 */
        Event.clearRuntime();
        /* Clear all runtime event handlers. */
        Event.off(null, 'runtime:*');
    }

    // Initialize the stage.
    Event.on(window, 'ui:resize', null, handleResize);
    Event.on(document.body, 'ui:wb-resize', null, handleResize);


    // for all of these functions, `this` is the scope object
    //
    // Contents of runtime (please add new handlers alphabetically)
    //
    // local - special for variables
    // array
    // boolean
    // color
    // control
    // geolocation
    // image
    // math
    // motion
    // object
    // path
    // point
    // random
    // rect
    // shape
    // size
    // sound
    // sprite
    // stage
    // string
    // text
    // vector

    global.runtime = {
        clear: clearRuntime,
        resetCanvas: resetCanvas, // deprecated - refer to "canvas" as "stage"
        getStage: canvas,
        resetStage: resetCanvas,
        handleResize: handleResize,

        local: {
            //temporary fix for locals
            value: function(){
                return this.value;
            }
        },

        array: {
            create: function(){
                return [].slice.call(arguments);
            },
            copy: function(a){
                return a.slice();
            },
            itemAt: function(a,i){
                return a[i];
            },
            join: function(a,s){
                return a.join(s);
            },
            append: function(a,item){
                a.push(item);
            },
            prepend: function(a,item){
                a.unshift(item);
            },
            length: function(a){
                return a.length;
            },
            removeItem: function(a,i){
                a.splice(i,1);
            },
            pop: function(a){
                return a.pop();
            },
            shift: function(a){
                return a.shift();
            },
            reverse: function(a){
                return a.reverse();
            }
        },

        'boolean': {
            and: function(a,b){
                return a && b;
            },
            or: function(a,b){
                return a || b;
            },
            xor: function(a,b){
                return !a !== !b;
            },
            not: function(a){
                return !a;
            }
        },
        color: {
            namedColor: function(name){
                // FIXME: We may need to return hex or other color value
                return name;
            },
            rgb: function(r,g,b){
                return 'rgb(' + r + ',' + g + ',' + b + ')';
            },
            rgba: function(r,g,b,a){
                return 'rgba(' + r + ',' + g + ',' + b + ',' + a/100 + ')';
            },
            grey: function(g){
                return 'rgb(' + g + ',' + g + ',' + g + ')';
            },
            hsl: function(h,s,l){
                return 'hsl(' + h + ',' + s + '%,' + l + '%)';
            },
            hsla: function(h,s,l,a){
                return 'hsl(' + h + ',' + s + '%,' + l + '%,' + a/100 + ')';
            },
            random: function(){
                return "#"+(~~(Math.random()*(1<<30))).toString(16).toUpperCase().slice(0,6);
            },
            fill: function(color){
                getContext().fillStyle = color;
            },
            stroke: function(color){
                getContext().strokeStyle = color;
            },
            shadow: function(color, blur){
                getContext().shadowColor = color;
                getContext().shadowBlur = blur;
            }
        },

        control: {
            whenProgramRuns: function(strand, frame, containers, args){
                strand.newFrame(containers[0]);
            },
            eachFrame: function(strand, frame, containers, args){
                var container = containers[0];
                /* Delegate to new frame handler. */
                strand.newFrameHandler(container);
            },
            frame: function(){
                return runtime.control._frame;
            },
            elapsed: function(){
                return runtime.control._elapsed;
            },
            setVariable: function(nameValuePair){
                //FIXME: Make sure this is named properly
                var name = nameValuePair[0];
                var value = nameValuePair[1];
                this[name] = value;
            },
            getVariable: function(name){
                return this[name];
            },
            incrementVariable: function(variable, value){
                this[name] += value;
            },

            loopOver: function(strand, frame, containers, args) {
                var scope = this;
                var iterable = args[0];
                var container = containers[0];
                var type = util.type(iterable);

                var value, length, keys;
                var index = 0;

                /* Get the length, based on type. */
                switch(type){
                    case 'array': // fall through
                    case 'string':
                        length = iterable.length;
                        break;
                    case 'object':
                        keys = Object.keys(iterable);
                        length = keys.length;
                        break;
                    case 'number':
                        length = iterable;
                        break;
                    case 'boolean':
                        /* Leave it undefined! */
                        break;
                }

                /* Pick the appropriate "should do another iteration"
                 * callback, based on type. */
                var shouldContinue = ({
                    boolean: function () { return value; },
                    number: function () { return value <= length; },
                    object: function () { return index < length; },
                    array: function () { return index < length; },
                    string: function () { return index < length; },
                }[type]);

                var getValue = ({
                    boolean: function () {
                        /* Reevaluate the loop-condition. */
                        return frame.gatherValues(scope)[0];
                    },
                    number: function () { return index + 1; },
                    string: function () { return iterable[index]; },
                    array: function () { return iterable[index]; },
                    object: function () { return iterable[keys[index]]; },
                }[type]);

                /* Check if the array is empty, boolean starts false, etc. */
                updateState();
                if (!shouldContinue()) {
                    strand.noOperation();
                    return;
                }

                /* Spawn then new frame. */
                strand.newScope(container, function() {
                    index++;
                    updateState();

                    return shouldContinue() ? container : null;
                });
                function updateState() {
                    /* Set the locals. */
                    /* FIXME: This has to take local names into account! */
                    scope.value = value = getValue();
                    /* Use the key value  if we have an object. */
                    scope.indexOrKey = keys === undefined ? index : keys[index];

                }
            },
            broadcast: function(eventName, data){
                // Handle with and without data
                Event.trigger(document.body, eventName, data);
            },
            /**
             * FIXME: Update to new API.
             * FIXME: Must implement Strand#newEventHandler.
             */
            receive: function(args, containers){
                // Handle with and without data
                // Has a local for the data
                var self = this;
                Event.on(document.body, 'runtime:' + args[0], null, function(evt){
                    // FIXME: how do I get the local from here?
                    // As an arg would be easiest
                    self[args[1]] = evt.detail;
                    containers[0].forEach(function(block){
                        block.run(self);
                    });
                });
            },
            'if': function(strand, frame, containers, args){
                if (args[0]){
                    strand.newScope(containers[0]);
                } else {
                    strand.noOperation();
                }
            },
            ifElse: function(strand, frame, containers, args){
                var branch = args[0] ? containers[0] : containers[1];
                strand.newScope(branch);
            },
            /* FIXME: How do we make this _lazy_? */
            ternary: function(cond, iftrue, otherwise){
                return cond ? iftrue : otherwise;
            },
            ask: function(args){
                var message = args[0];
                var name = args[1];
                var answer = prompt(message);
                runtime.control.setVariable(name, answer);
            },
            commentContext: function (strand) {
                strand.noOperation();
            },
            comment: function(){
            },
            log: function(item){
                console.log(item);
            },
            alert: function(x){
                alert(x);
            },
        },


        /*
         * The underlying JavaScript object is the same object that is passed
         * to the getCurrentLocation callback.
         */
        geolocation: {
            /* Synchronous "get current location" */
            currentLocation: function () {
                return util.geolocation.currentLocation;
            },
            /* Asynchronous update event. Context. */
            whenLocationUpdated: function(args, containers) {
                var currentScope = this;
                var steps = containers[0];

                Event.on(window, 'runtime:locationchanged', null, function (event) {
                    // TODO: Update to strand.newEventHandler()
                    steps.forEach(function (block) {
                        block.run(currentScope);
                    });
                });
            },
            // Returns the distance between two points in meters.
            // taken from http://www.movable-type.co.uk/scripts/latlong.html
            // Using the haversine formula.
            distanceBetween: function (p1, p2) {
                var R = 6371000; // m
                var lat1 = p1.coords.latitude;
                var lon1 = p1.coords.longitude;
                var lat2 = p2.coords.latitude;
                var lon2 = p2.coords.longitude;

                var φ1 = util.deg2rad(lat1);
                var φ2 = util.deg2rad(lat2);
                var Δφ = util.deg2rad(lat2-lat1);
                var Δλ = util.deg2rad(lon2-lon1);

                var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ/2) * Math.sin(Δλ/2);
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

                return R * c;
            },
            /* Returns latitude in degrees. */
            // TODO: should this return a "degrees" object?
            latitude: function (location) {
                return location.coords.latitude;
            },
            /* Returns longitude in degrees. */
            // TODO: should this return a "degrees" object?
            longitude: function (location) {
                return location.coords.longitude;
            },
            /* Returns altitude as a unit? */
            altitude: function (location) {
                return location.coords.altitude;
            },
            /* Returns degrees from north. */
            heading: function (location) {
                // TODO: What do we do when this is NaN or NULL?
                return location.coords.heading;
            },
            /* Returns estimated speed. */
            speed: function (location) {
                // TODO: What do we do when this is NaN or NULL?
                return location.coords.speed;
            },
        },

        image: {
            get: function(path){
                return assets.images[path];
            },
            drawAtPoint: function(img, pt){
                img.drawAtPoint(getContext(), pt);
            },
            getWidth: function(img){
                return img.getWidth();
            },
            getHeight: function(img){
                return img.getHeight();
            },
            setWidth: function(img, w){
                img.setWidth(w);
            },
            setHeight: function(img, h){
                img.setHeight(h);
            },
            setSize: function(img, sz){
                img.setSize(sz);
            },
            scale: function(img, scaleFactor){
                img.scale(scaleFactor);
            }
        },
        input: {
            keyPressed: function(key){
                if(Event.keys[key])
                    return true;
                else
                    return false;
            },
            mouseX: function(){
                return (Event.pointerX-Event.stage.left);
            },
            mouseY: function(){
                return (Event.pointerY-Event.stage.top);
            },
            mouseDown: function(){
                return Event.pointerDown;
            },
            whenKeyPressed: function(args, containers){
                var self = this;
                Event.onKeyDown(args[0], function(){
                    containers[0].forEach(function(block){
                        block.run(self);
                    });
                });
            },
        },

        math: {
            add: util.add,
            subtract: util.subtract,
            multiply: util.multiply,
            divide: util.divide,
            equal: function(a,b){
                return a === b;
            },
            notEqual: function(a,b){
                return a !== b;
            },
            lt: function(a,b){
                return a < b;
            },
            lte: function(a,b){
                return a <= b;
            },
            gt: function(a,b){
                return a > b;
            },
            gte: function(a,b){
                return a >= b;
            },
            mod: function(a,b){
                return a % b;
            },
            round: Math.round,
            abs: Math.abs,
            floor: Math.floor,
            ceil: Math.ceil,
            max: Math.max,
            min: Math.min,
            cos: function(a){
                return Math.cos(util.deg2rad(a));
            },
            sin: function(a){
                return Math.sin(util.deg2rad(a));
            },
            tan: function(a){
                return Math.tan(util.deg2rad(a));
            },
            asin: function(a){
                return Math.asin(util.deg2rad(a));
            },
            acos: function(a){
                return Math.acos(util.deg2rad(a));
            },
            atan: function(a){
                return Math.atan(util.deg2rad(a));
            },
            pow: function(a,b){
                return Math.pow(a, b);
            },
            sqrt: function(a,b){
                return Math.sqrt(a);
            },
            pi: function(){
                return Math.PI;
            },
            e: function(){
                return Math.E;
            },
            tau: function(){
                return Math.PI * 2;
            },
            deg2rad: util.deg2rad,
            rad2deg: util.rad2deg,
            stringToNumber: Number
        },

        motion: {
            /* Asynchronous update event. Context. */
            whenDeviceTurned: function(args, containers) {
                var currentScope = this,
                steps = containers[0];

                Event.on(window, 'runtime:motionchanged', null, function (event) {
                    if (args[0] === util.motion.direction) {
                        steps.forEach(function (block) {
                            block.run(currentScope);
                        });
                    }
                });
            },
            /* Synchronous "get current location" */
            tiltDirection: function(){
                return util.motion.direction;
            }
        },

        object: {
            empty: function () {
                return {};
            },
            create: function () {
                var i, key, val, obj;
                obj = {};
                // Get key/value pairs from arguments.
                for (i = 0; i < arguments.length; i++) {
                    key = arguments[i][0];
                    val = arguments[i][1];
                    obj[key] = val;
                }
                return obj;
            },
            getValue: function (obj, key) {
                return obj[key];
            },
            getKeys: function (obj) {
                return Object.keys(obj);
            }
        },

        path:{

            lineTo: function(toPoint){
                return new util.Path(getContext().lineTo, new Array(toPoint.x, toPoint.y))
            },

            bezierCurveTo: function(toPoint, controlPoint1, controlPoint2){
                return new util.Path(getContext().bezierCurveTo, new Array(controlPoint1.x, controlPoint1.y,
                                                                    controlPoint2.x, controlPoint2.y, toPoint.x,
                                                                    toPoint.y));
            },
            moveTo: function(toPoint){
                return new util.Path(getContext().moveTo, new Array(toPoint.x, toPoint.y));
            },
            quadraticCurveTo: function(toPoint, controlPoint){
                return new util.Path(getContext().quadraticCurveTo, new Array(controlPoint.x,
                                                                       controlPoint.y,toPoint.x, toPoint.y));
            },
            arcTo: function(radius, controlPoint1, controlPoint2){
                return new util.Path(getContext().arcTo, new Array(controlPoint1.x,
                                                            controlPoint1.y,controlPoint2.x, controlPoint2.y,
                                                            radius));
            },
            closePath: function(){
                return new util.Path(getContext().closePath);
            },
            pathSet: function(args){
                return new util.Shape(Array.prototype.slice.call(arguments));
            },

            lineStyle: function(width, color, capStyle, joinStyle){
                getContext().lineWidth = width;
                getContext().strokeStyle = color;
                getContext().lineCap = capStyle;
                getContext().lineJoin = joinStyle;
            }

        },

        point: {
            create: function(x,y){
                return new util.Point(x,y);
            },
            fromVector: function(vec){
                return new util.Point(vec.x, vec.y);
            },
            fromArray: function(arr){
                return new util.Point(arr[0], arr[1]);
            },
            randomPoint: function(){
                return new util.Point(util.randInt(Event.stage.width), util.randInt(Event.stage.height));
            },
            x: function(pt){
                return pt.x;
            },
            y: function(pt){
                return pt.y;
            },
            toArray: function(pt){
                return [pt.x, pt.y];
            },
        },

        random: {
            randFloat: Math.random,
            randInt: util.randInt,
            noise: util.noise,
            choice: util.choice
        },

        rect: {
            fromCoordinates: function (x, y, width, height) {
                return new util.Rect(x, y, width, height);
            },
            fromVectors: function (point, size) {
                return util.Rect.fromVectors(point, size);
            },
            fromArray: function (a) {
                if (a.length < 4) {
                    throw new Error('Array must have at least four elements.');
                }
                return new util.Rect(a[0], a[1], a[2], a[3]);
            },
            getPosition: function (rect) {
                return rect.getPosition();
            },
            getSize: function (rect) {
                return rect.getSize();
            },
            asArray: function (rect) {
                return [rect.x, rect.y, rect.size.width, rect.size.height];
            },
            getX: function (rect) {
                return rect.x;
            },
            getY: function (rect) {
                return rect.y;
            },
            getWidth: function (rect) {
                return rect.size.width;
            },
            getHeight: function (rect) {
                return rect.size.height;
            }
        },

        shape: {
            draw: function(shapeArg){
                shapeArg.draw(getContext());
            },
            fill: function(shapeArg){
                shapeArg.draw(getContext());
                getContext().fill();
            },
            stroke: function(shapeArg){
                shapeArg.draw(getContext());
                getContext().stroke();
            },
            setLineWidth: function(width){
                getContext().lineWidth = width;
            },
            circle: function(pt, rad){
                return new util.Shape(function(ctx){
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2, true);
                });
            },
            rectangle: function(pt, width, height, orientation){
                return new util.Shape(function(ctx){
                    ctx.beginPath();
                    if(orientation == "center"){
                        ctx.moveTo(pt.x - width/2, pt.y - height/2);
                        ctx.lineTo(pt.x + width/2, pt.y - height/2);
                        ctx.lineTo(pt.x + width/2, pt.y + height/2);
                        ctx.lineTo(pt.x - width/2, pt.y + height/2);
                        ctx.lineTo(pt.x - width/2, pt.y - height/2);
                    }
                    else{
                        ctx.moveTo(pt.x, pt.y);
                        ctx.lineTo(pt.x + width, pt.y);
                        ctx.lineTo(pt.x + width, pt.y + height);
                        ctx.lineTo(pt.x, pt.y + height);
                        ctx.lineTo(pt.x, pt.y);
                    }
                });
            },
            ellipse: function(pt, rad1, rad2, rot){
                return new util.Shape(function(ctx){
                    ctx.beginPath();
                    ctx.ellipse(pt.x, pt.y, rad1, rad2, rot, 0, Math.PI * 2);
                });
            },
        },
        size: {
            fromCoordinates: function (width, widthUnits, height, heightUnits) {
                return new util.Size(width, widthUnits, height, heightUnits);
            },
            fromArray: function (a, widthUnits, heightUnits) {
                if (a.length < 2) {
                    throw new Error('Array must have at least two elements.');
                }
                return new util.Size(a[0], widthUnits, a[1], heightUnits);
            },
            toArray: function (size) {
                return [size.width, size.height];
            },
            getWidth: function (size) {
                return size.width;
            },
            getHeight: function (size) {
                return size.height;
            }
        },

        sound: {

            get: function(url){
                return assets.sounds[url]; // already cached by sounds library
            },
            play: function(sound){
                sound.play();
            },
            setLoop: function(sound, flag){
                sound.loop = flag;
            },
            setVolume: function(sound, volume){
                sound.volume = volume;
            },
            pause: function(sound){
                sound.pause();
            },
            playFrom: function(sound, time){
                sound.playFrom(time);
            },
            pan: function(sound, balance){
                sound.pan = balance;
            },
            echo_DelayFeedbackFilter: function(sound, delay, feedback, filter){
                sound.setEcho(delay, feedback, filter);
            },
            stopEcho: function(sound){
                sound.echo = false;
            },
            reverb_DurationDecayReverse: function(sound, duration, decay, reverse){
                sound.setReverb(duration, decay, reverse);
            },
            stopReverb: function(sound){
                sound.reverb = false;
            },
            effect: function(frequency, attack, decay, waveform, volume, balance, wait, pitchBend, reverseBend, random, dissonance, echoDelay, echoFeedback, echoFilter){
                return {
                    play: function(){
                        soundEffect(
                            frequency, attack, decay, waveform,
                            volume, balance, wait,
                            pitchBend, reverseBend, random, dissonance,
                            [echoDelay, echoFeedback, echoFilter]
                        );
                    }
                };
            }
        },

        sprite: {
            create: function(imgShapeOrSprite){
                return new util.Sprite(imgShapeOrSprite);
            },
            accelerate: function(spt, speed){
                spt.accelerate(speed);
            },
            setVelocity: function(spt, vec){
                spt.setVelocity(vec);
            },
            getXvel: function(spt){
                return spt.getXvel();
            },
            getYvel: function(spt){
                return spt.getYvel();
            },
            getXpos: function(spt){
                return spt.getXpos();
            },
            getYpos: function(spt){
                return spt.getYpos();
            },
            rotate: function(spt, angle){
                spt.rotate(angle);
            },
            rotateTo: function(spt, angle){
                spt.rotateTo(angle);
            },
            move: function(spt){
                spt.move();
            },
            moveTo: function(spt, pt){
                spt.moveTo(pt);
            },
            draw: function(spt){
                spt.draw(getContext());
            },
            applyForce: function(spt, vec){
                spt.applyForce(vec);
            },
            bounceAtEdge: function(spt){
                spt.bounceWithinRect(canvasRect());
            },
            wrapAtEdge: function(spt){
                spt.wrapAroundRect(canvasRect());
            },
            stopAtEdge: function(spt){
                spt.stayWithinRect(canvasRect());
            }
        },
        stage: {
            clearTo: new util.Method()
                .when(['string'], function(clr){ // unfortunately colors are still strings
                    var r = canvasRect();
                    getContext().fillStyle = clr;
                    getContext().fillRect(r.x, r.y, r.width, r.height);
                })
                .when(['wbimage'], function(img){
                    img.drawInRect(getContext(), canvasRect());
                })
            .fn(),
            stageWidth: function(){
                return Event.stage.width;
            },
            stageHeight: function(){
                return Event.stage.height;
            },
            centerX: function(){
                return (Event.stage.width / 2);
            },
            centerY: function(){
                return (Event.stage.height / 2);
            },
            randomX: function(){
                return Math.random() * Event.stage.width;
            },
            randomY: function(){
                return Math.random() * Event.stage.height;
            },
        },
        string: {

            toString: function(x){
                return x.toString();
            },
            split: function(x,y){
                return x.split(y);
            },
            concatenate: function(x,y){
                return x.concat(y);
            },
            repeat: function(x,n){
                var str = "";
                for(var i=0; i<n; i++){
                    str = str.concat(x);
                }
                return str;
            },
            getChar: function(n,x){
                if(n<0)
                    n = x.length + n;

                return x.charAt(n);
            },
            getCharFromEnd: function(n,x){
                if(n<=0)
                    n = n*(-1)-1;
                else
                    n = x.length-n;
                return x.charAt(n);
            },
            substring: function(x,a,b){
                if(a<0)
                    return "";
                else
                    return x.substring(a,a+b);
            },
            substring2: function(x,a,b){
                if(a<0 || a>x.length)
                    return "";
                else
                    return x.substring(a,b);
            },
            isSubstring: function(x,y){
                if(y.indexOf(x)===-1){
                    return false;
                }
                else{
                    return true;
                }
            },
            substringPosition: function(x,y){
                return y.indexOf(x);
            },
            replaceSubstring: function(x,y,z){
                return x.replace(new RegExp(y, 'g'), z);
            },
            trimWhitespace: function(x){
                return x.trim();
            },
            uppercase: function(x){
                return x.toUpperCase();
            },
            lowercase: function(x){
                return x.toLowerCase();
            },
            matches: function(x,y){
                return x===y;
            },
            doesntMatch: function(x,y){
                return !(x===y);
            },
            startsWith: function(x,y){
                return (x.lastIndexOf(y, 0) === 0);
            },
            endsWith: function(x,y){
                return x.indexOf(y, x.length - y.length) !== -1;
            }
        },

        text:{
            setFont: function (size, fontStyle){
                var sizeString = size[0] + size[1];
                getContext().font = sizeString + " " + fontStyle;

            },
            textAlign: function (alignment){
                getContext().textAlign = alignment;
            },
            textBaseline: function (baseline){
                getContext().textBaseline = baseline;
            },
            fillText: function (text, x, y){
                getContext().fillText(text, x, y);
            },
            fillTextWidth: function (text, x, y, width){
                getContext().fillText(text, x, y, width);
            },
            strokeText: function (text, x, y){
                getContext().strokeText(text, x, y);
            },
            strokeTextWidth: function (text, x, y, width){
                getContext().strokeText(text, x, y, width);
            },
            width: function (text){
                var textMetric = getContext().measureText(text);
                return textMetric.width;
            }
        },
        vector: {
            create: function create(x,y){
                return new util.Vector(x,y);
            },
            createPolar: function fromPolar(deg, mag){
                return util.Vector.fromPolar(deg, mag);
            },
            rotateTo: function rotateTo(vec, deg){
                return vec.rotateTo(deg);
            },
            rotate: function rotate(vec, deg){
                return vec.rotate(deg);
            },
            magnitude: function magnitude(vec){
                return vec.magnitude();
            },
            degrees: function degrees(vec){
                return vec.degrees();
            },
            normalize: function normalize(vec){
                return vec.normalize();
            },
            x: function x(vec){
                return vec.x;
            },
            y: function y(vec){
                return vec.y;
            },
            randomUnitVector: function randomUnitVector(){
                return util.Vector.fromPolar(util.randInt(0,359), 1);
            }
        }
    };


})(window);
