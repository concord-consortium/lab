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
