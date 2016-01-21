title: "Configuration in ASP.NET Core MVC"
layout: post
tags:
  - "ASP.NET Core"
  - "ASP.NET 5"
categories:
  - Code Dive
authorId: james_chambers
date: 2016-01-20 20:27:23
---

![Config in Startup.cs](https://jcblogimages.blob.core.windows.net:443/img/2016/01/startup-config.png)

ASP.NET Core MVC introduces a new configuration system that adds flexibility and simultaneously enables cross-platform support (in a way that makes sense on other platforms). In this post we're going to cover the basics of configuration and what you can expect as you look at the project template from File -> New Project in Visual Studio 2015.

<!-- more -->

<span class="side-note">ASP.NET Core was previously called ASP.NET 5, and before that ASP.NET vNext. ASP.NET Core MVC is what was referred to as MVC 6. The tooling and the branding will change in the weeks and months ahead, but the basics of configuration I detail here should remain relatively in-tact.</span>

## Configuration Happens Early

In earlier versions of MVC it is true that the configuration was loaded very early in the process. If you had values in your App.Config they got gobbled up at startup. The problem was, you didn't have a chance to really interact with the configuration system - it just was what it was. This usually meant that we would create our own systems for loading the values, we'd get creative in how we balanced config-time and run-time values and, in short, we'd have to do the heavy-lifting ourselves.

ASP.NET Core lets us be much more opinionated about what goes on while registering the configuration values. Sure, it does and should still load configuration pre-startup, but now we can play a role in the process. 

````
public Startup(IHostingEnvironment env)
{
    // Set up configuration sources.
    var builder = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json")
        .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true);

    if (env.IsDevelopment())
    {
        builder.AddUserSecrets();
    }

    builder.AddEnvironmentVariables();
    Configuration = builder.Build();
}
````

As you can see above, the first lines of code on the first bit of code our application contains what is needed to load our configuration.  

## Configuration Happens Often, if You Like

More importantly, we get a say in how and where the configuration is loaded from. A great example of this is that we can load a JSON file for the default config and then later use environment variables to overload those defaults. 

That code about  is the `Startup` method of the `Startup` class, and we're very certain about when the config is loaded and where from. We even get to test if we're in the development envionment.

This comes in handy when you're deploying to Azure or would like to test with your own values instead of making changes to the JSON config file that would otherwise be checked in with the project.

Speaking of which, you're going to likely need to store some values in there that you _will never want to share_, and that you'll never want to check into your repo. This would be things like API tokens for integration into third-party services and the like (think SendGrid, Twilio, PayPal and the like).

## Configuration Opens Doors for Secrets

And that brings us to user secrets. It's still not clear how these guys are going to shake down - there's still active discussion about how it should be named and stored - but the idea is straightforward and lets you work locally with sensitive data without having to modify your config. You can think of them as "environment variables for your project". 

There is pretty basic tooling from the command line:

![User Secrets](https://jcblogimages.blob.core.windows.net:443/img/2016/01/user-secret.png)

The secrets are stored in your user data here:

    %APPDATA%\microsoft\UserSecrets\
    
If you've used secrets, there will be a sub-folder here for each project you've created. Depending on where they land, the secrets will likely be a combination of the project name and a GUID, but you can set this yourself in your project.json.

I'll do a follow-up post on user secrets and demonstrate in greater detail how to leverage it in your projects.

## Next Steps

We're still in an RC period (should it be called beta?) and there are naming pieces yet to come, but there is nothing stopping you from learning about the configuration system in ASP.NET Core today. Grab a copy of Visual Studio 2015 - [hey, it's free!]() - and start experimenting with the bits. Be sure to check back in the weeks ahead for more information about configuration in ASP.NET Core and Core MVC.

Happy coding!

