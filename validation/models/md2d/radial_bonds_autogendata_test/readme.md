
Goals:

1. Generate the theoretical expectations
2. Generate the data from Java MW
    a. generate MML and CML models
    b. run models, collect results
    c. generate aggregate statistics from results
3. Generate data from HTML5 MW
    a. generate JSON model files
    b. run models, collect results
    c. generate aggregate statistics from results
4.  Combine, graph, and analyze results from theoretical, Java MW, and HTML5 MW.
5.  Generate pass/fail test for HTML5 MW that can be run automatically

Working: script that generates Java MW CML and MML files, converts to HTML5 MW JSON and generates results by running HTML5 MD2D

    ruby validation/models/md2d/epsilon/generate.rb