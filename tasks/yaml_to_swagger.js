/*
 * grunt-yaml-to-swagger
 * 
 *
 * Copyright (c) 2014 Cyril GIACOPINO
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks
    Array.prototype.getUnique = function () {
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
        sources.forEach(function (source) {
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

    function execSync(cmd, args, callback) {
        var options = {
            // The command to execute. It should be in the system path.
            cmd: cmd,
            args: args
        };
        grunt.util.spawn(options, callback)
    }

    function parseFiles(files, options, callback) {
        var fs = require('fs');
        var path = require('path').resolve(options.route_path + '/');
        var working = false;
        var interval = setInterval(function () {
            if (files.length > 0) {
                if (working == false) {
                    working = true;
                    var file = files[0];
                    var file_path = require('path').resolve(path + '/' + file);
                    try {
                        var route_definitions = require('yamljs').load(file_path);
                    } catch (e) {
                        console.log("error");
                        grunt.fatal(e.message);
                    }

                    var base_filename = file.split(".yml")[0];
                    var outputFilename = options.output_docs_path + "/" + base_filename + ".json";

                    var returnData = {};
                    //console.log(JSON.stringify(route_definitions));
                    var models = [];
                    for (var j = 0; j < route_definitions.apis.length; j++) {
                        var operations = route_definitions.apis[j].operations;
                        for (var i = 0; i < operations.length; i++) {
                            if (!contains(primitives, operations[i].type)) {
                                models.push(operations[i].type);
                            }

                        }
                    }
                    models = models.getUnique();
                    parseModels(models, options, function (data) {
                        route_definitions.models = data;

                        var pretty_route_definitions = JSON.stringify(route_definitions, undefined, 2);

                        var matches = pretty_route_definitions.match(/:(\w)+/g);
                        if (matches != null && matches.length > 0) {
                            for (var replace = 0; replace < matches.length; replace++) {
                                var field = matches[replace].split(":").join("");
                                pretty_route_definitions = pretty_route_definitions.split(matches[replace]).join("{" + field + "}");
                            }
                        }

                        fs.writeFileSync(outputFilename, pretty_route_definitions);
                        grunt.log.ok(base_filename + ".json created");
                        files.splice(0, 1);
                        working = false;
                    });

                }
            } else {
                clearInterval(interval);
                callback();
            }
        }, 100);
    }

    function parseModels(models, options, callback) {
        var fs = require('fs');
        var returnData = {};
        var working = false;
        var interval = setInterval(function () {
            if (models.length > 0) {
                if (working == false) {
                    working = true;
                    var args = ['schema', require("path").resolve(options.models_path + '/' + models[0] + '.ts')];
                    execSync('typson', args, function (error, result, code) {
                        if (error == null) {
                            var schemaJson = JSON.parse(result);
                            schemaJson.basePath = options.base_url_ws;
                            var result = JSON.stringify(schemaJson);
                            var pattern = new RegExp('\[MockType=(\w)+\]', "g");
                            var matches = result.match(/\[MockType=(\w)+\]/g);
                            if (matches != null && matches.length > 0) {
                                for (var replace = 0; replace < matches.length; replace++) {
                                    result = result.split(matches[replace]).join("");
                                }
                            }
                            returnData = extend(returnData, JSON.parse(result));
                            models.splice(0, 1);
                            working = false;
                        } else {
                            grunt.log.error('typson ' + args.join(" "));
                            grunt.fatal(error);
                        }

                    });

                }
            } else {
                clearInterval(interval);
                callback(returnData);
            }
        }, 100);

    }

    function createMockSchema(options, callback) {
        var fs = require('fs');

        var models_files = fs.readdirSync(options.models_path);
        var models = [];
        for (var i = 0; i < models_files.length; i++) {
            var file = models_files[i];
            var extension = file.split('.').pop();
            if (extension == "ts") {
                models.push(file);
            }

        }
        var returnData = {};
        var working = false;
        var interval = setInterval(function () {
            if (models.length > 0) {
                if (working == false) {
                    working = true;
                    var args = ['schema', require("path").resolve(options.models_path + '/' + models[0])];
                    execSync('typson', args, function (error, result, code) {
                        if (error == null) {
                            var schemaJson = JSON.parse(result);
                            schemaJson.basePath = options.base_url_ws;
                            var result = JSON.stringify(schemaJson);
                            var pretty_schema = JSON.stringify(JSON.parse(result), undefined, 2);
                            fs.writeFileSync(options.models_path + 'schema/' + models[0].split(".ts").join('.json'), pretty_schema);
                            models.splice(0, 1);
                            working = false;
                        } else {
                            grunt.log.error('typson ' + args.join(" "));
                            grunt.fatal(error);
                        }

                    });

                }
            } else {
                clearInterval(interval);
                callback();
            }
        }, 100);
    }

    grunt.registerMultiTask('yaml_to_swagger', 'Convert YAML files into swagger compatible JSON Schema format', function () {

        var fs = require('fs');
        var options = this.options();

        var done = this.async();
        createMockSchema(options, function () {
            var path_api = require('path').resolve(options.route_path + '/api.yml');
            var api_definitions = require('yamljs').load(path_api);
            var files = [];
            for (var i = 0; i < api_definitions.apis.length; i++) {
                var path = api_definitions.apis[i].path.split("/").join("");
                files.push(api_definitions.apis[i].path + '.yml');
            }
            var outputFilename = options.output_docs_path + "/api.json";
            var pretty_route_definitions = JSON.stringify(api_definitions, undefined, 2);
            fs.writeFileSync(outputFilename, pretty_route_definitions);
            grunt.log.ok("/api.json created");
            parseFiles(files, options, function () {
                done();
            });
        });

    });

};
