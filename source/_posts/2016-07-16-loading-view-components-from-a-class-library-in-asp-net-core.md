---
layout: post
title: Loading View Components from a Class Library in ASP.NET Core MVC
tags:
  - ASP.NET Core
  - MVC
  - View Components
categories:
  - Development   
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2016/07/16/loading-view-components-from-a-class-library-in-asp-net-core.aspx'
date: 2016-07-16 08:36:36
excerpt: In today's post we take a look at how view components can be implemented in a separate class library and shared across multiple web applications.
---
In a previous post we explored the new [View Component](http://www.davepaquette.com/archive/2016/01/02/goodbye-child-actions-hello-view-components.aspx) feature of ASP.NET Core MVC. In today's post we take a look at how view components can be implemented in a separate class library and shared across multiple web applications.

## Creating a class library
First, add a  a new .NET Core class library to your solution.

![Add class library](http://www.davepaquette.com/images/external_view_components/create_new_class_library.png)

This is the class library where we will add our view components but before we can do that we have to add a reference to the MVC and Razor bits.

{% codeblock lang:javascript %}
    "dependencies": {
        "NETStandard.Library": "1.6.0",
        "Microsoft.AspNetCore.Mvc": "1.0.0",
        "Microsoft.AspNetCore.Razor.Tools": {
            "version": "1.0.0-preview2-final",
            "type": "build"
        }
    },
    "tools": {
        "Microsoft.AspNetCore.Razor.Tools": "1.0.0-preview2-final"
    }
{% endcodeblock %}

Now we can add a view component class to the project. I created a simple example view component called `SimpleViewComponent`.

{% codeblock lang:javascript %}
[ViewComponent(Name = "ViewComponentLibrary.Simple")]
public class SimpleViewComponent : ViewComponent
{
    public IViewComponentResult Invoke(int number)
    {
        return View(number + 1);
    }
}
{% endcodeblock %}

By convention, MVC would have assigned the name `Simple` to this view component. This view component is implemented in a class library with the intention of using it across multiple web apps which opens up the possibility of naming conflicts with other view components. To avoid naming conflicts, I overrode the name using the `[ViewComponent]` attribute and prefixed the name with the name of my class library.

Next, I added a `Default.cshtml` view to the `ViewComponentLibrary` in the `Views\Shared\Components\Simple` folder. 

{% codeblock lang:csharp %}
@model Int32

<h1>
    Hello from an external View Component!
</h1>
<h3>Your number is @Model</h3>
{% endcodeblock %} 

For this view to be recognized by the web application, we need to include the `cshtml` files as embedded resources in the class library. Currently, this is done by adding the following setting to the `project.json` file.

{% codeblock lang:javascript %}
"buildOptions": {
    "embed": "Views/**/*.cshtml"
}
{% endcodeblock %} 

## Referencing external view components
The first step in using the external view components in our web application project is to add a reference to the class library. Once the reference is added, we need tell the Razor view engine that views are stored as resources in the external view library. We can do this by adding some additional configuration code to the `ConfigureServices` method in `Startup.cs`. The additional code creates a new `EmbeddedFileProvider` for the class library then adds that file provider to the `RazorViewEngineOptions`.

{% codeblock lang:csharp %}
public void ConfigureServices(IServiceCollection services)
{
    // Add framework services.
    services.AddApplicationInsightsTelemetry(Configuration);

    services.AddMvc();

    //Get a reference to the assembly that contains the view components
    var assembly = typeof(ViewComponentLibrary.ViewComponents.SimpleViewComponent).GetTypeInfo().Assembly;

    //Create an EmbeddedFileProvider for that assembly
    var embeddedFileProvider = new EmbeddedFileProvider(
        assembly,
        "ViewComponentLibrary"
    );

    //Add the file provider to the Razor view engine
    services.Configure<RazorViewEngineOptions>(options =>
    {                
        options.FileProviders.Add(embeddedFileProvider);
    });
}
{% endcodeblock %}

Now everything is wired up and we can invoke the view component just like we would for any other view component in our ASP.NET Core MVC application.

{% codeblock lang:csharp %}
<div class="row">
    @await Component.InvokeAsync("ViewComponentLibrary.Simple", new { number = 5 })
</div>
{% endcodeblock %}

## Wrapping it up
Storing view components in a separate assembly allows them to be shared across multiple projects. It also opens up the possibility of creating a simple plugin architecture for your application. We will explore the plugin idea in more detail in a future post.

You can take a look at the full source code on [GitHub](https://github.com/AspNetMonsters/ExternalViewComponents).