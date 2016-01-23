title: Strongly-Typed Configuration in ASP.NET Core MVC
layout: post
tags:
  - ASP.NET Core
categories:
  - Code Dive
authorId: james_chambers
date: 2016-01-23 10:29:12
---

Over the last __[two](http://jameschambers.com/2016/01/Configuration-in-ASP-NET-Core-MVC/)__ __[posts](http://jameschambers.com/2016/01/json-config-in-aspnetcoremvc/)__ I worked through the basics of configuration in ASP.NET and how to leverage structured data in your JSON config files. Now it's time to take a deeper look at how to access relevant parts of your configuration throughout the rest of your project.

![Strongly-Typed Settings Classes in ASP.NET Core](https://jcblogimages.blob.core.windows.net:443/img/2016/01/typed-settings.png)

<!-- more -->

I contribute to an open source project called [AllReady](https://github.com/HTBox/allReady) from the [Humanitarian Toolbox](http://htbox.org). One of the things that we do on the project is use Azure Storage Queues to send and process messages in a different execution context to keep our main application moving along nicely. In order to do this, I added some properties to the configuration file under a storage node:  

````
  "Data": {
    "DefaultConnection": {
      "ConnectionString": "Server=(localdb)\\MSSQLLocalDB;Database=AllReady;Integrated Security=true;MultipleActiveResultsets=true;"
    },
    "Storage": {
      "AzureStorage": "[storagekey]",    
      "EnableAzureQueueService": "false"
    }
  }
 ````

Obviously, "`[storagekey]`" is not a valid key to access a storage account in Azure, but you'll notice that I also have a flag in there to enable/disable the queue service. By putting this in place, we can toggle the service used at dev time and, rather than writing to the queue, we can instead write to the local console. Of course, we have the propery key set in our Azure Web App so that it's loaded and overridden at run time with the correct value. I discussed nomenclature of the keys you'd use in my post on [JSON Configuration](http://jameschambers.com/2016/01/json-config-in-aspnetcoremvc/).

## Exposing Configuration Accross the Application

Now, to actually put the storage settings from our config in play, we're going to create a class to contain the properties that we will need to inspect at runtime.

````
    public class AzureStorageSettings
    {
        public string AzureStorage { get; set; }
        public bool EnableAzureQueueService { get; set; }
    }
````

This class is a one-to-one mapping of the values we put in our `Storage` section. All that's left is to get the values from our configuration in there.
  
## The Options Pattern for Configuration

Originally I was loading up these properties one-by-each, line after line of reading from the config and assigning the values to the instance of the `AzureStorageSettings` class. But in the fall I had the opportunity to work with [Ryan Nowak](https://github.com/rynowak) of the ASP.NET team and he showed me a much better approach with what the ASP.NET team refers to as the options pattern. It's basically closing the loop on the work we have above and giving us the ability to get at our configuration with strongy-typed objects.

As a reminder, our `Configuration` property back in `startup.cs` is an instance of an `IConfiguration`, built from the `ConfigurationBuilder` in our constructor. It contains all the data that we've added in key-value pairs, and we can now use that object to expose the information we need through our IoC container when we're configuring our services.

````
    public void ConfigureServices(IServiceCollection services)
    {
        services.Configure<AzureStorageSettings>(Configuration.GetSection("Data:Storage"));
        
        // other service configuration code here...
    }
````

What we have to do is call the `GetSection` method along with the corresponding path to where the object instance's properties will be loaded from. Our `Storage` information was in the `Data` property at the root of the document, so we pack it in as `Data:Storage` as the parameter to `GetSection`.
 
Now I've got configuration in my IoC container and I've got a class that represents the slice of configuration that I'm interested in. Now I want to mux those up and use it in my service (or controller or anything that is spun up with IoC). To do that I simply inject it into my constructor like so:

````
    public QueueStorageService(IOptions<AzureStorageSettings> options)
    {
        AzureStorageSettings settings = options.Value;
        
        // work with settings
        var cloudStorageKey = options.Value.AzureStorage;
    }
````
    
By simply accepting a parameter of type `IOptions<AzureStorageSettings>` in the constructor of my controller, the appropriate configuration elements are parsed out and provided to me in the `Value` property as an instance of my `AzureStorageSettings` class. 

Note: You'll have to add a using statement to your controller or service for the `IOptions` interface: 

    using Microsoft.Extensions.OptionsModel;

## Wrapping Up

So to review, there are a couple of things we need to do:
 
 - Create the configuration section
 - Create an object that corresponds to our configuration properties
 - Expose the settings class in our IoC container
 - Leverage `IOptions<>` to inject the settings into our constructor

As you can see, this is a powerful and efficient way to create strongly-typed configuration objects in your ASP.NET Core MVC projects. It takes a minute to wrap your head around the pieces that are in play, but we can do away with the old method of custom configuration sections and simply represent our configuration data as JSON.

Happy coding!
