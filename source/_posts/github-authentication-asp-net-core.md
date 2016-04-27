title: 'GitHub Authentication with ASP.NET Core'
layout: post
tags:
  - Visual Studio 2015
  - Authentication
categories:
  - Development
authorId: james_chambers
originalUrl: 'http://jameschambers.com/2016/04/github-authentication-asp-net-core/'
date: 2016-04-26 07:12:54
---
Authentication has changed over the years, and my take on it has surely shifted. No longer is it the scary, intimidating beastie that must be overcome on our projects. Today, we can let external providers provide the authentication mechanisms, giving the user with a streamlined experience that can give them access to our application with previuosly defined credentials.

![GitHub Authentication in ASP.NET Core](https://jcblogimages.blob.core.windows.net/img/2016/04/github-auth.png)

Let's have a look at what it takes to allow users to authenticate in our application using GitHub as the login source, and you can check out the Monsters video take of this on [Channel 9](https://channel9.msdn.com/Series/aspnetmonsters/Episode-26-GitHub-Authentication-in-ASPNET-Core).

<!-- more -->

## Background and Overview

OAuth has been known as a complicated spec to adhere to, and this is further perpetuated by the fact that while much of the mechanics are the same among authentication providers, the implementation of how one retrieves information about the logged in user is different from source-to-source.

The security repo for ASP.NET gives us some pretty good options for the big, wider market plays like Facebook and Twitter, but there is aren't - nor can or should there be - packages for every provider. GitHub is appealing as a source when we target other developers, and while it lacks a package of its own, we can leverage the raw OAuth provider and implement the user profile loading details on our own. 

In short, the steps are as follows:
 1. Install the `Microsoft.AspNet.Authentication.OAuth` package
 1. Register you application in GitHub
 1. Configurate the OAuth parameters in your application
 1. Enable the OAuth middleware
 1. Retrieve the claims for the user

Okay, now let's dive into the nitty gritty of it.

## Install the Package

First step is a gimme.  Just head into your `project.json` and add the package to the list of dependencies in your application.

````
  "Microsoft.AspNet.Authentication.OAuth": "1.0.0-rc1-final",
````

You can see here that I am on RC1, so assume there may still be some changes to the naming and, obviously, the version of the package you'll want to use.

## Create the App in GitHub

Pull down the user account menu from your avatar in the top-right corner of GitHub, then select Settings. Next, go to the OAuth Applications section and create a new application. This is pretty straightforward, but it's worth pointing out a few things.

![Creating an OAuth app in GitHub](https://jcblogimages.blob.core.windows.net:443/img/2016/04/github-app.png)

First, you'll need to note your client ID and secret, or minimally, you'll want to leave the browser window open. 

Second you'll see that I have a authorization callback setup in the app as follows:

`https://localhost:44363/signin-github`

This is important for two reasons: 

1. This will only work locally on your machine
2. The `signin-github` bit will need to be configured in our middleware

If you want better control over how that is configured in your application, you can incorporate the appropriate settings into your configuration files, but you'll also need to update your GitHub app. This process is still relevant - you'll likely want something to test with locallying without having to deploy to test your application.

## Configure Your Client ID and Secret
  For production applications you'll be fine to set environment variables or configure application settings in Azure (which are loaded as env vars), but locally you'll want access to the config as well. You can setup [user secrets via the command line](https://channel9.msdn.com/Series/aspnetmonsters/Episode-23-Working-With-Sensitive-Data-User-Secrets), or you can just right-click on your project in Visual Studio 2015 and select "Manage User Secrets". From there, you set it up like so:

````
{
  "GitHub:ClientId": "your_id",
  "GitHub:ClientSecret": "your_secret"
}
````

## Enable OAuth Middleware

In the above code we also wired up some code to fire during the `OnCreatingTicket` event, so let's implement that next.  To do this, we'll add the middleare to the `Configure` method in our startup class, and add a property to the class to expose our desired settings.

The middleware call is like so:
` app.UseOAuthAuthentication(GitHubOptions);`

And we create the property as such:
<script src="https://gist.github.com/MisterJames/746331337329ca50556cbff19a0ba176.js"></script>

Remember that callback path that we setup on GitHub, you'll see it again in our settings above. You'll also note that we're retrieving our client ID and secret from our configuration, and that we're setting up a handler when the auth ticket is created so that we can go fetch additional details about the authenticating party.

## Retrieve the User's Claims
We'll have to call back out to GitHub to get the user's details, they don't come back with the base calls for authentication. This is the part that is different for each provider, and thus you'll need to write this part for yourself if you wish to use an alternate source for authentication.

We will add two parts to this; the first will call out to get the information about the user, the second will parse the result to extract the claims. Both of these can live in your `startup.cs` class.

<script src="https://gist.github.com/MisterJames/6a2ee9918afa9019aa3c1891f216102a.js"></script>

<script src="https://gist.github.com/MisterJames/c818ad44950d1c7312e2d36b93041407.js"></script>

Unfortunately the base implementation of the OAuth provider does not support allowing us to request additional fields for the user; I'll take a look at that in a future post. All you're going to get are the basics with the above - so none of the account details beyond the email addres, nor ability to work with their repos/issues/PRs.

## Next Steps

There you have it. All the chops you need to start exercising your OAuth muscle, and a basic implementation that you can leverage as a starting point. Trying this out will take you about 15 minutes, start to finish, provided you already have a GitHub account.

 1. [Get the latest VS 2015 and ASP.NET Core bits](https://get.asp.net/)
 1. [Explore the ASP.NET security repo on GitHub](https://github.com/aspnet/security)
 1. Run through the samples above.

Finally, check out the Monsters' video on Channel 9 where I code this live.

<iframe src="https://channel9.msdn.com/Series/aspnetmonsters/Episode-26-GitHub-Authentication-in-ASPNET-Core/player" width="640" height="360" allowFullScreen frameBorder="0"></iframe>

Happy Coding!