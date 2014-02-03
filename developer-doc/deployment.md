# Deployment

## Deploying static content to a Github gh-pages branch

Github's [github:pages](http://pages.github.com/) feature supports sharing any content in
a `gh-pages` repository branch as static web content.

The [gh-pages branch of the Lab repository](https://github.com/concord-consortium/lab/tree/gh-pages)
is used to store the static pages and client-side code built by the Makefile at the directory `public`.

  [concord-consortium.github.com/lab](http://concord-consortium.github.com/lab/)

In addition the content of the `gh-pages` branch is used to create the
[downloadable archive distributions of Lab](#distribution-of-project-and-examples)

The contents of the gh-pages branch are automatically made available in a standard
web-page form (as opposed to the standard Github page for showing a repository) at this url:

  [concord-consortium.github.com/lab](http://concord-consortium.github.com/lab/)

   when you push to the gh-pages branch.

If you maintain a fork of this project on Github, you get a Github Page for free, and the
instructions below apply to you as well!

### Making the `public/` folder track the gh-pages branch

If you haven't done this yet, make the `public` folder track the contents of the gh-pages branch.

**If you have a `Guard` process running make sure and stop it before continuing!**

    # public/ needs to be empty for git clone to be happy:
    rm -rf public

    # substitute the URL for whatever fork of the Lab repository you have write access to:
    git clone git@github.com:concord-consortium/lab.git -b gh-pages public

Note that `make clean` now empties the `public` folder in-place, leaving the Git
`public/.git` and `public/jnlp` directories intact.

### Pushing changes to gh-pages branch

First, make sure your `public` folder tracks the gh-pages branch, as per the above.

Then run the following shell command in the `script/` folder:

    script/gh-pages

This script will first make sure there is nothing that isn't committed. If
there are unstaged or staged and uncommitted files the `gh-pages` script will halt.

Test and commit (or save the changes to a topic branch) and if your testing show
the bugs are fixed or the new features or examples are stable then push
these changes to the master branch and try running the `gh-pages` script again:

    git push origin master
    script/gh-pages

## Deploying to a remote server

The Lab project has a suite of scripts for creating and deploying to EC2 servers running
on Amazon Web services (AWS).

The scripts for creating, stopping and re-creating a server require an AWS account. These scrpts use
the Ruby proge

The Capistrano scripts for updating a deployment to an existing server only require that you have a copy of
the pem file associated

To deploy to AWS you will need an AWS account and the ability to create and modify EC2 instances.

If you are create a new server from scratch you will also need access to the AWS DNS service Route53.

**Note: currently there are a few steps/resources that only work properly if you have a concord.org
AWS account.**

### AWS Setup/Prerequisites

1.  AWS account. For deployment to the lab servers managed by CC you will need an AWS
    account managed by concord.org.
2.  Create your AWS Access Key ID and AWS Secret Access Key. To do this, go to the IAM Dashboard in
    AWS (Services -> IAM), click 'Users', click the checkbox by your username, and select User Actions ->
    Manage Access Keys
3.  Copy your AWS Access Key ID and AWS Secret Access Key to the following yaml configuration
    file `.fog` in your home directory:

        :default:
          :aws_access_key_id: YOUR_AWS_ACCESS_KEY_ID
          :aws_secret_access_key: YOUR_AWS_SECRET_ACCESS_KEY

4.  Place a copy of a the appropriate AWS PEM file on your local files system. For deployment
    to the lab servers managed by CC use the `lab-dev` pem. This can be found in CC's Google Docs/Drive.
    This file should have its permissions set to 600, and the folder it is in (e.g. ~/.ec2) should be 700.
5.  Create or identify an appropriate AWS security group. For deployment to the lab servers managed
    by CC the `lab.dev` security group is used.
6.  Edit the `:deploy` section of `config/config.yml` using values in `config/config.sample.yml`
    as a guide.

    Here's an example from the `:deploy` section of a working `config.yml`:

        :deploy:
          :targets:
          - :name: lab-dev
            :url: lab.dev.concord.org
            :branch: master
          :group_name: lab.dev
          :zone_domain: concord.org.
          :zone_records_name: dev.concord.org
          :pem:
            :name: lab-dev
            :path: ~/.ec2

    There is one deploy target named `lab-dev` associated with a server running at `lab.dev.concord.org`.
    Deployments to `lab-dev` use the master branch of the repository. The `lab.dev` security group is
    used when new servers are created or existing sever are re-created.

    When a whole new server is created the DNS entry is created in the `concord.org.` zone domain and
    when searching for an existing DNS entry for a `deploy-target` the zone record name `dev.concord.org`
    is used.

    Besides the AWS Access Key ID and AWS Secret Access Key security credentials copyied locally to
    to the file `~/.fog` the `lab-dev.pem` file saved in the directory: `~/.ec2` is also used when
    communicating with AWS.

7.  List the deploy targets described in `config/config.yml` with the task: `thor cloud:list_targets`
    to confirm the configuration is valid:

        $ thor cloud:list_targets

          Deploy Targets
          name                    url                           branch
        ------------------------------------------------------------------------------------------
          lab-dev                 lab.dev.concord.org           master

8.  Generate specific Capistrano deploy tasks and littlechef nodes using `deploy-targets`
    specified in `config/config.yml`. Run this `thor` task whenever you change the `:deploy`
    section in `config/config.yml` to generate the Ruby Capastrano configuration files in
    `config/deployment/<deploy-target>.rb` and the littlechef JSON configurations in
    `config/littlechef/nodes/<deploy-target>.json`

        $ thor cloud:setup

9.  List the running AWS server instances to confirm that your local AWS security credentials
    are setup correctly:

        $ thor cloud:list

          target              hostname                      state         ipaddress           ec2-id          ec2-dns
        ------------------------------------------------------------------------------------------------------------------------------------------------------
          lab-dev             lab.dev.concord.org.          running       107.22.184.173      i-f844ec81      ec2-107-22-184-173.compute-1.amazonaws.com

10. If you are working with an existing host that has already been setup such as `lab.dev.concord.org`
    generate the proper ssh configuration and add the remote host key to `~/.ssh/known_hosts`.
    This adds a local **`ubuntu`** user in `~/ssh/config` and connects to the remote host to add the key.

    Example of setting up SSH configuration with the existing remote AWS host: `lab..dev.concord.org`:

        $ thor cloud:setup_ssh lab.dev.concord.org

11. You will have to manually edit config/config.yml on your new host.  
    SSH into your host, and edit the configuration file config/config.yml. 
    The setup process should notify you of this (from aws-lab-server.rb): 
    "If the new server provisioning with littlechef was successful 
    login to the server with ssh and update the server hostname settings 
    in config/config.yml".

    **TODO**: Should we write a tool to easily view/edit configuration files?


## Using Capstrano to deploy new code to an existing server

After testing, committing, and pushing code to a public repository use the Capistrano
tasks to update a remote server.

The capistrano commands take the form:

    cap <deploy-target> task

The basic command to update a server:

    cap <deploy-target> deploy:update

Here are the list of current Capistrano deploy commands:

    $ cap -T deploy:
    cap deploy:restart          # restart rails app
    cap deploy:clean_and_update # clean and update server
    cap deploy:setup            # setup server
    cap deploy:status           # display last commit on deployed server
    cap deploy:update           # update server
    cap deploy:update_jnlps     # update public/jnlp dir on server

Update the `lab.dev.concord.org` server with the latest code committed on the master branch on
[concord-consortium/lab](https://github.com/concord-consortium/lab}):

    cap lab-dev deploy:update

When you have made changes in the repository like adding or updating a git submodule in
`src/vendor` then you will need instead run the `deploy:clean_and_update` task:

    cap lab-dev deploy:clean_and_update

## Updating the Java jar resources on a remote rerver

The Java resources require much less frequent updates since the main body of work
for Lab is occuriring in the HTML5 development.

The capistrano task: `deploy:update_jnlps` erases the `public/jnlp/`
directory on the remote server and re-generates and deploy the packed signed
jars from source or from downloads:

    $ cap <deploy-target> deploy:update_jnlps

The resulting directory on the server will look something like this:

    $ tree /var/www/app/public/jnlp/
    public/jnlp/
    └── org
        └── concord
            ├── energy2d
            │   ├── energy2d__V0.1.0-20120531.005123-1.jar
            │   └── energy2d__V0.1.0-20120531.005123-1.jar.pack.gz
            └── modeler
                ├── mw__V2.1.0-20120531.005123-1.jar
                └── mw__V2.1.0-20120531.005123-1.jar.pack.gz

## Managing AWS servers with thor tasks

There are a set of [thor](#thor) tasks for managing, creating, and re-creating AWS servers for Lab:

    $ thor -T
    cloud
    -----
    thor cloud:create hostname                       # create a new server instance using this hostname
    thor cloud:delete hostname                       # delete an existing server instance running at this hostname
    thor cloud:find_dns_record hostname              # find dns record for hostname
    thor cloud:list                                  # list existing servers
    thor cloud:list_targets                          # list existing deploy targets
    thor cloud:recreate hostname                     # recreate a new server instance for this hostname by destroying and rebuilding an existing server
    thor cloud:setup                                 # setup capistrano deploy tasks and littlechef nodes using targets in config/config.yml
    thor cloud:setup_ssh hostname                    # setup ssh configuration for communication to hostname
    thor cloud:start ec2_id                          # start a stopped existing server instance using the ec2-id
    thor cloud:stop reference                        # stop a running existing server instance at this hostname or ec2-id
    thor cloud:update reference                      # update server <ec2_id|hostname> provisioning with littlechef 'lab-server' role
    thor cloud:update_dns_record hostname ipaddress  # updating IP address for DNS record hostname to ipaddress


## Creating a new AWS Lab Server

Creating a new Lab server on AWS consists of three steps:

1. Creating a new hostname, server, and provisioning the server with thor:

        $ thor cloud:create <hostname>

      This task will create a new **hostname** as a DNS A record if the **hostname** does not already exists.

      If the hostname already exists as a CNAME first login to the [AWS:Route53](https://console.aws.amazon.com/route53/home)
      service and delete the existing host name.

      If the new DNS entry for **hostname** is not properly propogated when the hostname is created or
      changed you will get an error that looks something like this:

        *** running local command: echo '
        Host <hostname>
          User ubuntu
          IdentityFile ~/.ec2/lab-dev.pem
        ' >> ~/.ssh/config

        *** running local command: ssh-keygen -R <hostname>
        /Users/stephen/.ssh/known_hosts updated.
        Original contents retained as /Users/stephen/.ssh/known_hosts.old

        *** running local command: ssh ubuntu@<hostname> -o StrictHostKeyChecking=no exit
        ssh: Could not resolve hostname <hostname>: nodename nor servname provided, or not known

        *** updating littlechef node: <hostname>.json

        *** provisioning <hostname> with littlechef role: lab-server
            <ec2-id>, <ec2-hostname>, <new-ip-address>
            command: cd /Users/stephen/dev/concord/lab/config/littlechef && fix node:<hostname> role:lab-server


        == Applying role 'lab-server' to <hostname> ==

        Fatal error: Name lookup failed for <hostname>

        Underlying exception:
            nodename nor servname provided, or not known

      You will need to resolve the issue with getting the correct DNS record for **hostname** before
      continuing. After this is resolved you can follow these steps to continue the initial setup and
      provisioning:

        $ ssh-keygen -R <hostname>
        $ ssh ubuntu@<hostname> -o StrictHostKeyChecking=no exit
        $ thor cloud:update  <hostname>

2. Optionally configure the server to use a valid Java code-siging certificate.

      If you wish to support the integration of the optional Java resources that are required to be signed to work:

      - legacy Molecular Worbench and Energy2D Java Web Start applications
      - Java-based Vernier GoIO browser-sensor applet integration

      You should put copy of a valid Java siging certificate keystore on **hostname** and edit
      `config/config.yml` to reference this keystore before running `cap <deploy-target> deploy:setup`

      The one supplied with the repository is a sample self-signed certificate and end user will be warned that it
      is not valid.

      Here is one way to acomplish this:

        $ scp <path-to-keystore> deploy@<hostname>:/var/www/app/config/<new-keystore-name>.jks

      Now ssh to the new host and edit the [java section](https://github.com/concord-consortium/lab/blob/master/config/config.sample.yml#L2-6)
      of `/var/www/app/config/config.yml` to update the values for `:password`, `:alias`, and `:keystore_path`.

3. Finishing the setup of the server with a capistrano task

        $ cap <deploy-target> deploy:setup

    This completes the initial deploy and builds of all the project resources to the server.
