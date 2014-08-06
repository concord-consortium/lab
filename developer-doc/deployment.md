# Deployment

## Deploying content to S3

The travis-ci config in the .travis.yml file will try to deploy every travis build to an S3 bucket.
This done mostly by `script/s3-deploy.sh`. It uses s3_website which is configured by `config/s3_website.yml`

The S3 bucket name is defined in config/s3_website.yml. The AWS identify info is in secure variables in
the `.travis.yml` file.

NOTE: the S3 bucket must be setup with CORS otherwise the webfonts will not be handled correctly. This is
done with the following CORS configuration that can be added through the AWS GUI:

```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
        <AllowedHeader>Authorization</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
```

If you are using CloudFront infront of the S3 bucket you will also need to setup the CloudFront
distribution to handle CORS correctly. This
[AWS documentation section](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html#header-caching-web-cors) provides details. Basically you need to edit the default `behavior` or create a new one. Then
select `whitelist` for the `forward headers` option. And then add the `Origin` header to the whitelist.

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
