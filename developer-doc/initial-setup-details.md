## Details on the initial setup for development

The readme contains the following steps for initial setup:

1. Clone the git repository
2. `cd lab`
3. `cp config/config.sample.yml config/config.yml`
4. `make everything`
5. open another new terminal and run `rackup config.ru`
6. open http://localhost:9191
7. (optional) open a new terminal and run `guard`
8. (optional) `cp -vn script/post-commit .git/hooks/`

### 1. Clone the git repository

Use git to create a local clone of the Lab repository.
If you aren't familiar with git, you should read one of the tutorials on it.

If you have commit access to the repository use this form:

    git clone git@github.com:concord-consortium/lab.git

Alternatively if you don’t have commit access use this form:

    git clone git://github.com/concord-consortium/lab.git

### 2. `cd lab`

Open a shell and change to the `lab/` directory. The first time you `cd` into the `lab/` directory
RVM will switch to using `ruby-2.0.0-p247` based on the `.ruby-version` file in the repository.
Additionally the `.ruby-gemset` tells RVM to install the gems in a gemset named `lab`. So together
these files tell RVM to store and load gems from the `ruby-2.0.0-p247@lab` gemset.

If you don't have `ruby-2.0.0-p247` already installed rvm will display the command you need to
run to install it. Run this command if required.

If you do end up having to install a new version of Ruby with RVM change out of and back into the lab directory after the RVM install of Ruby is complete:

    cd ..; cd lab

### 3. `cp config/config.sample.yml config/config.yml`

Copy the sample project configuration file to `config/config.yml`
You can examine it and edit it if you want: [project configuration documentation](developer-doc/configuration.md)

### 4. `make everything`

This will download and install all the dependencies and build the whole project for the first time.
When `make everything` is run on a freshly cloned repository it performs the following tasks:

1.  Install the runtime dependencies as git submodules into the `vendor/` directory:

        git submodule update --init --recursive

2.  Install the development dependencies that use [nodejs](http://nodejs.org/) and
    are managed by [npm](http://npmjs.org/):

        npm install

    You can see the list of dependencies to be installed in the file `package.json`. In addition
    `vendor/d3` and `vendor/science.js` are manually installed into `node_modules/`.

3.  Install the additional RubyGems used for development: haml, sass, guard ...

        bundle install

4.  Generates the `public` directory:

You should now be able to open the file: `public/index.html` in a browser however most things won't work correctly.
This is because of the limitation of the `file` protocol in browsers. Continue on to see about setting up the server.

### 5. open another new terminal and run `rackup config.ru`

Startup the Rack-based Lab server for local development. This is simple rack application that mainly just serves
the files in public. It does contain a dynamic extension:

- a [shutterbug](https://github.com/concord-consortium/shutterbug) service so you can take snapshots locally

Alternatively you can use `python -m SimpleHTTPServer` to run a python server. Currently it won't handle the applets and it won't support snapshots, but you might not need those features.

### 6. open http://localhost:9191

Now that the files in public are built and a server is running you can view the Lab site locally.

### 7. (optional) open a new terminal and run `guard`

Start watching the `src/` and `test/` directories with [Guard](dependencies.md#guard) and when files are
changed automatically generate the JavaScript Lab modules, the examples, and run the tests.

In addition changes in `src/lab/` generate the associated Lab modules in `lab/` and copy these modules
to `public/lab/`. In addition any change in either the `src/lab/` or `test/`directories will run the
tests and display the results in the console window where `guard`
is running.

This is optional because you can also just manually run `make` after making changes.

### 8. (optional) `cp -vn script/post-commit .git/hooks/`

Add a git post-commit hook. After every commit `src/lab/lab.version.js` should be updated to include recent
version and build information for Lab's distribution. This is done with a git post-commit hook.
There is a pre built one in `script/post-commit` which you can copy:

    cp -vn script/post-commit .git/hooks/

If you already have a post-commit file the above command will tell you. So instead add the following line to
your existing `post-commit`:

    (cd $GIT_DIR/.. && ./script/update-git-commit-and-branch.rb)

This is optional because having updated version information is only needed if you are submitting benchmarks
from your local machine. These benchmarks include the commit information, so it is best to have it updated.
