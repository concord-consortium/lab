## Details on the initial setup for development

The readme contains the following steps for initial setup:

1. Clone the git repository
2. `cd lab`
3. `make everything`
4. open another new terminal and run `rackup config.ru`
5. open http://localhost:9191
6. (optional) open a new terminal and run `guard`

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

### 3. `npm install`

This will download and install all the JavaScript dependencies. You can see the list of dependencies to be installed in the file `package.json`.

### 3. `npm run build`

This will build the whole project.

1.  Install the runtime dependencies as git submodules into the `vendor/` directory:

        git submodule update --init --recursive

2.  Install the additional RubyGems used for development: haml, sass, guard ...

        bundle install

3.  Generates the `public` directory:

You should now be able to open the file: `public/index.html` in a browser however most things won't work correctly.
This is because of the limitation of the `file` protocol in browsers. Continue on to see about setting up the server.

### 4. open another new terminal and run `npm start`

This is a simple HTTP server that mainly just serves the files in public.

### 5. open http://localhost:9191

Now that the files in public are built and a server is running you can view the Lab site locally.
