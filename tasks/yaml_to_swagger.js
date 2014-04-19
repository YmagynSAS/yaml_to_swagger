/*
 * grunt-yaml-to-swagger
 * 
 *
 * Copyright (c) 2014 Cyril GIACOPINO
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks
    Array.prototype.getUnique = function() {
        var u = {}, a = [];
        for (var i = 0, l = this.length; i < l; ++i) {
            if (u.hasOwnProperty(this[i])) {
                continue;
            }
            a.push(this[i]);
            u[this[i]] = 1;
        }
        return a;
    }



    var primitives = [
        "array",
        "boolean",
        "integer",
        "number",
        "null",
        "object",
        "string"
    ];
    function contains(a, obj) {
        var i = a.length;
        while (i--) {
            if (a[i] === obj) {
                return true;
            }
        }
        return false;
    }
    function extend(target) {
        var sources = [].slice.call(arguments, 1);
        sources.forEach(function(source) {
            for (var prop in source) {
                target[prop] = source[prop];
            }
        });
        return target;
    }

    function isEmpty(obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                return false;
        }

        return true;
    }

    function parseModels(route_definitions, options, base_filename, callback)
    {
        var returnData = {};
        //console.log(JSON.stringify(route_definitions));
        var models = [];
        for (var j = 0; j < route_definitions.apis.length; j++)
        {
            var operations = route_definitions.apis[j].operations;
            for (var i = 0; i < operations.length; i++)
            {
                if (!contains(primitives, operations[i].type))
                {
                    models.push(operations[i].type);
                }

            }
        }
        models = models.getUnique();

        var exec = require('child_process').exec,
                child,
                done = grunt.task.current.async(); // Tells Grunt that an async task is complete

        var currentTask = 0;
        for (var i = 0; i < models.length; i++)
        {
            var execSync = require("exec-sync");
            execSync('typson schema ' + require("path").resolve(options.models_path + '/' + models[i] + '.ts'));
            /*child = exec('typson schema ' + require("path").resolve(options.models_path + '/' + models[i] + '.ts'),
             function(error, stdout, stderr) {
             if (stderr == "")
             {
             returnData = extend(returnData, JSON.parse(stdout));
             }
             currentTask++;
             });*/
        }
        setInterval(function()
        {
            if (currentTask == models.length)
            {
                if (!isEmpty(returnData))
                {
                    route_definitions.models = returnData;
                }
                callback(route_definitions, base_filename);
            }
        }, 100);
    }

    function makeRoutes(file, callback)
    {

    }

    function doWork(files, callback)
    {
        console.log(files.length);
        var currentTask = 0;
        setTimeout(function()
        {
            currentTask = 3;
        }, 1500);

        setInterval(function()
        {
            if (currentTask == files.length)
            {
                callback();
            }
        }, 100);

    }
    grunt.registerMultiTask('yaml_to_swagger', 'Convert YAML files into swagger compatible JSON Schema format', function() {

        var fs = require('fs');
        var options = this.options();
        var path = require('path').resolve(options.route_path + '/');
        var done = grunt.task.current.async();
        var files = fs.readdirSync(path);
        require("async").each(files, function(file, callback) {
            if(file == "api.yml")
            {
                var file_path = require('path').resolve(path + '/' + file);
                var route_definitions = require('yamljs').load(file_path);
                var pretty_route_definitions = JSON.stringify(route_definitions, undefined, 2);
                var base_filename = file.split(".yml")[0];
                var outputFilename = options.output_docs_path + "/" + base_filename + ".json";
                fs.writeFileSync(outputFilename, pretty_route_definitions);
                grunt.log.ok(base_filename + ".json created");
            }
            if (file.match(/.+\.yml/g) !== null && file != "api.yml") {
                var file_path = require('path').resolve(path + '/' + file);
                var route_definitions = require('yamljs').load(file_path);
                var base_filename = file.split(".yml")[0];
                var returnData = {};
                //console.log(JSON.stringify(route_definitions));
                var models = [];
                for (var j = 0; j < route_definitions.apis.length; j++)
                {
                    var operations = route_definitions.apis[j].operations;
                    for (var i = 0; i < operations.length; i++)
                    {
                        if (!contains(primitives, operations[i].type))
                        {
                            models.push(operations[i].type);
                        }

                    }
                }
                models = models.getUnique();

                if (models.length > 0) {
                    require("async").each(models, function(model, callbackTest) {
                        var exec = require('child_process').exec;
                        exec('typson schema ' + require("path").resolve(options.models_path + '/' + model + '.ts'),
                                function(error, stdout, stderr) {
                                    if (stderr == "")
                                    {
                                        returnData = extend(returnData, JSON.parse(stdout));

                                        route_definitions.models = returnData;
                                        var pretty_route_definitions = JSON.stringify(route_definitions, undefined, 2);
                                        var outputFilename = options.output_docs_path + "/" + base_filename + ".json";
                                        fs.writeFileSync(outputFilename, pretty_route_definitions);
                                        grunt.log.ok(base_filename + ".json created");
                                        callbackTest();
                                    }
                                });
                    }, function(err)
                    {
                        if (err) {
                            // One of the iterations produced an error.
                            // All processing will now stop.
                            console.log('A file failed to process');
                        } else {
                            callback();
                        }
                    });
                } else {
                    var pretty_route_definitions = JSON.stringify(route_definitions, undefined, 2);
                    var outputFilename = options.output_docs_path + "/" + base_filename + ".json";
                    fs.writeFileSync(outputFilename, pretty_route_definitions);
                    grunt.log.ok(base_filename + ".json created");
                }

            }
        }, function(err) {
            // if any of the file processing produced an error, err would equal that error
            if (err) {
                // One of the iterations produced an error.
                // All processing will now stop.
                console.log('A file failed to process');
            } else {
                console.log('All files have been processed successfully');
            }
        });

        /*fs.readdirSync(path).forEach(function(file) {
         if (file.match(/.+\.yml/g) !== null && file != "api.yml") {
         var file_path = require('path').resolve(path + '/' + file);
         var route_definitions = require('yamljs').load(file_path);
         var base_filename = file.split(".yml")[0];
         var done = grunt.task.current.async();
         parseModels(route_definitions, options, base_filename, function(route_definitions, base_filename)
         {
         console.log(route_definitions);
         var pretty_route_definitions = JSON.stringify(route_definitions, undefined, 2);
         var outputFilename = options.output_docs_path + "/" + base_filename + ".json";
         fs.writeFileSync(outputFilename, pretty_route_definitions);
         grunt.log.ok(base_filename + ".json created");
         done();
         });
         
         }
         });*/
    });

};
