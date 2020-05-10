---
layout: post
title: Deploying a Static Site to Azure Using the az CLI
tags:
  - Azure
  - Web Dev
  - AZ CLI
categories:
  - Development
authorId: dave_paquette
originalurl: 'https://www.davepaquette.com/archive/2020/05/10/deploying-a-static-site-to-azure-using-the-az-cli.aspx'
date: 2020-05-10 18:30:00
excerpt: The az command line interface (cli) is a powerful tool for creating, modifying and deploying to Azure resources. Since it's a cli AND cross platform, it's also a great tool for automating your deployments. In this post, we'll use the az cli to deploy a static site to Azure.
---
I was recently working on a project where the frontend was built in React. The project was hosted on Azure and we wanted to use Azure CDN to host the React app. I have been looking at the az cli recently and decided to use it on this project to script the setup of resources and deployments to Azure.

## Setting up the AZ CLI
First up, [install the az cli](https://docs.microsoft.com/en-us/cli/azure/?view=azure-cli-latest).

Once installed, you'll need to login to your Azure Subscription.

```
az login
```

A browser window will popup, prompting you to log in to your Azure account. Once you've logged in, the browser window will close and the az cli will display a list of subscriptions available in your account. If you have more than one subscription, make sure you select the one you want to use.

```
az account set --subscription YourSubscriptionId
```

## Create a Resource Group
You will need a resource group for your Storage and CDN resources. If you don't already have one, create it here.
```
az group create --name DavesFancyApp --location SouthCentralUs
```

Most commands will require you to pass in a `--resource-group` and `--location` parameters. These parameters are `-g` and `-l` for short, but you can save yourself even more keystrokes by setting defaults for `az`.

```
az configure -d group=DavesFancyApp
az configure -d location=SouthCentralUs
```

## Create a Storage Account for Static Hosting

First, create a storage account:

```
az storage account create --name davefancyapp123
```

Then, enable static site hosting for this account.

```
az storage blob service-properties update --account-name davefancyapp123 --static-website --404-document 404.html --index-document index.html
```

Your storage account will now have a blob container named `$web`. That contents of that container will be available on the URL _accountname_.z21.web.core.windows.net/. For example, https://davefancyapp123.z21.web.core.windows.net/.

## Deploying your app
To deploy your app to the site, all you need to do is copy your app's static files to the `$web` container in the storage account you created above. For my react app, that means running `npm run build` and copying the build output to the `$web` container. 

```
az storage blob upload-batch --account-name davefancyapp123 -s ./build -d '$web'
```
Now your site should be available via the static hosting URL above. That was easy!

## Create a CDN Profile and Endpoint
Next up, we are going to put a Content Delivery Network (CDN) endpoint in front of the blob storage account. We want to use a CDN for a couple reasons. First, it's going to provide much better performance overall. CDNs are optimized for delivering web content to user's devices and we should take advantage of that as much as possible. The second reason is that a CDN will allow us to configure SSL on a custom domain name.

First, we will need to create a CDN Profile. There are a few different of CDNs offerings available in Azure. You can read about them [here](https://docs.microsoft.com/azure/cdn/cdn-features). In this example, we will us the Standard Microsoft CDN.

```
az cdn profile create -n davefancyapp123cdn --sku Standard_Microsoft
```

Next, we will create the CDN endpoint. Here we need to set the origin to the static hosting URL from the previous step. Note that we don't include the protocol portion of the URL.

```
az cdn endpoint create -n davefancyapp123cdnendpoint --profile-name davefancyapp123cdn --origin davefancyapp123.z21.web.core.windows.net --origin-host-header davefancyapp123.z21.web.core.windows.net --enable-compression
```

Note: See the [az cli docs](https://docs.microsoft.com/en-us/cli/azure/cdn/endpoint?view=azure-cli-latest#az-cdn-endpoint-create) for more information on the options available when creating a CDN endpoint.

Now your site should be available from _endpointname_.azureedge.net. In my case https://davefancyapp123cdnendpoint.azureedge.net/. Note that the endpoint is created quickly but it can take some time for the actual content to propagate through the CDN. You might initially get a 404 when you visit the URL.

### Create CDN Endpoint Rules
These 2 steps are optional. The first one is highly recommended. The second is optional depending on the type of app your deploying. 

First, create URL Redirect rule to redirect any HTTP requests to HTTPS.

```
 az cdn endpoint rule add -n davefancyapp123cdnendpoint --profile-name davefancyapp123cdn --rule-name enforcehttps --order 1 --action-name "UrlRedirect"  --redirect-type Found --redirect-protocol HTTPS --match-variable RequestScheme --operator Equal --match-value HTTP
```

Next, if you're deploying a Single Page Application (SPA) built in your favourite JavaScript framework (e.g. Vue, React, Angular), you will want a URL Rewrite rule that returns the app's root `index.html` file for any request to a path that isn't an actual file. There are many variations on how to write this rule. I found this to be the simplest one that worked for me. Basically if the request path is not for a specific file with a file extension, rewrite to `index.html`. This allows users to directly navigate to a route in my SPA and still have the CDN serve the `index.html` that bootstraps the application.

```
az cdn endpoint rule add -n davefancyapp123cdnendpoint --profile-name davefancyapp123cdn --rule-name sparewrite --order 2 --action-name "UrlRewrite" --source-pattern '/' --destination /index.html --preserve-unmatched-path false --match-variable UrlFileExtension --operator LessThan --match-value 1
```

### Configuring a domain with an Azure Managed Certificate
The final step in configuring the CDN Endpoint is to configure a custom domain and enable HTTPS on that custom domain.

You will need access to update DNS records for the custom domain. Add a CNAME record for your subdomain that points to the CDN endpoint URL. For example, I created a CNAME record on my davepaquette.com domain:

```
CNAME    fancyapp   davefancyapp123cdnendpoint.azureedge.net
```

Once the CNAME record has been created, create a custom domain for your endpoint. 

```
az cdn custom-domain create --endpoint-name davefancyapp123cdnendpoint --profile-name davefancyapp123cdn -n fancyapp-domain --hostname fancyapp.davepaquette.com
```

And finally, enable HTTPs. Unfortunately, this step fails due to a [bug](https://github.com/Azure/azure-cli/issues/12152) in the AZ CLI. There's [a fix](https://github.com/Azure/azure-cli/pull/12648) on it's way for this but it hasn't been merged into the CLI tool yet.

```
az cdn custom-domain enable-https --endpoint-name davefancyapp123cdnendpoint --profile-name davefancyapp123cdn --name fancyapp-domain
```

Due to the bug, this command returns `InvalidResource - The resource format is invalid`.  For now, you can [do this step manually](https://docs.microsoft.com/en-us/azure/cdn/cdn-custom-ssl?tabs=option-1-default-enable-https-with-a-cdn-managed-certificate) in the Azure Portal. When using CDN Managed Certificates, the process is full automated. Azure will verify your domain using the CNAME record above, provision a certificate and configure the CDN endpoint to use that certificate. Certificates are fully managed by Azure. That includes generating new certificates so you don't need to worry about your certificate expiring.

#### CDN Managed Certificates for Root Domain
My biggest frustration with Azure CDN Endpoints is that CDN managed certificates are not supported for the apex/root domain. You can still use HTTPS but you need to bring your own certificate. 

The same limitation exists for managed certificates on App Service. If you share my frustration, [please upvote here](https://feedback.azure.com/forums/169385-web-apps/suggestions/38981932-add-naked-domain-support-to-app-service-managed-ce).


## Deploying updates to your application
The CDN will cache your files. That's great for performance but can be a royal pain when trying to deploy updates to your application. For SPA apps, I have found that simply telling the CDN to purge `index.html` is enough to ensure updates are available very shortly after deploying a new version. This works because most JavaScript frameworks today use WebPack which does a good job of cache-busting your JavaScript and CSS assets. You just need to make sure the browser is able to get the latest version of `index.html` and updates flow through nicely.

When you upload your latest files to blob storage, follow it with a purge command for `index.html` on the CDN endpoint.

```
az storage blob upload-batch --account-name davefancyapp123 -s ./build -d '$web'
az cdn endpoint purge -n davefancyapp123cdnendpoint --profile-name davefancyapp123cdn --no-wait --content-paths '/' '/index.html'
```

The purge command can take a while to complete. We pass the `--no-wait` option so the command returns immediately. 

## My thoughts on az
Aside from the bug I ran in to with enabling HTTPS on the CDN endpoint, I've really enjoyed my experience with the `az` cli. I was able to fully automate resource creation and deployments using the [GitHub Actions az cli action](https://github.com/marketplace/actions/azure-cli-action). I can see `az` becoming my preferred method of managing Azure resources.