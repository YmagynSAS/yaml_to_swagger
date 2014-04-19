/*
 * grunt-yaml-to-swagger
 * 
 *
 * Copyright (c) 2014 Cyril GIACOPINO
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        // Configuration to be run (and then tested).
        yaml_to_swagger: {
            all: {
                options: {
                    route_path: './../../api/routes',
                    models_path: './../../api/models/definitions',
                    output_docs_path: './../../api/api_docs'
                }
            }
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask('test', ['clean', 'yaml_to_swagger']);

    // By default, lint and run all tests.
    grunt.registerTask('default', ['yaml_to_swagger']);

};
