---
layout: post
title: Creating a New View Engine in ASP.NET Core
tags:
  - ASP.NET Core
  - MVC
  - Pugzor
categories:
  - Development
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2016/11/22/creating-a-new-view-engine-in-asp-net-core.aspx'
date: 2016-11-22 12:00
excerpt: At the ASP.NET Hackathon in Redmond, we replaced the Razor view engine with Pug. It started off as a joke but it kind of worked okay so we rolled with it. 
---

Earlier in November, the [ASP.NET Monsters](http://aspnetmonsters.com/2016/01/welcome/) had the opportunity to take part in the ASP.NET Core hackathon at the Microsoft MVP Summit. In past years, we have used the hackathon as an opportunity to spend some time working on GenFu. This year, we wanted to try something a little different.

## The Crazy Idea
A few months ago, we had [Taylor Mullen on The Monsters Weekly](https://channel9.msdn.com/Series/aspnetmonsters/ASPNET-Monsters-59-Razor-with-Taylor-Mullen) to chat about Razor in ASP.NET Core. At some point during that interview, it was pointed that MVC is designed in a way that a new view engine could easily be plugged into the framework. It was also noted that implementing a view engine is a really big job. This got us to thinking...what if we could find an existing view engine of some sort. How easy would it be to get actually put a new view engine in MVC?

And so, that was our goal for the hackathon. Find a way to replace Razor with an alternate view engine in a single day of hacking.

## Finding a Replacement
We wanted to pick something that in no way resembled Razor. Simon suggested [Pug](https://pugjs.org/api/getting-started.html) (previously known as Jade), a popular view template engine used in [Express](https://expressjs.com). In terms of syntax, Pug is about as different from Razor as it possibly could be. Pug uses whitespace to indicate nesting of elements and does away with angle brackets all together. For example, the following template:

{% codeblock %}
div
    a(href='google.com') Google
{% endcodeblock %}  

would generate this HTML:

{% codeblock lang:html %}
<div>
    <a href="google.com">Google</a>
</div>
{% endcodeblock %}

## Calling Pug from ASP.NET Core
The first major hurdle for us was figuring out a way to compile pug templates from within an ASP.NET Core application. Pug is a JavaScript based template engine and we only had a single day to pull this off so a full port of the engine to C# was not feasible. 

Our first thought was to use Edgejs to call Pug's JavaScript compile function. Some quick prototyping showed us that this worked but Edgejs doesn't have support for .NET Core. This lead us to explore the [JavaScriptServices](https://github.com/aspnet/JavaScriptServices) packages created by the ASP.NET Core team. Specifically the [Node Services](https://github.com/aspnet/JavaScriptServices/tree/dev/src/Microsoft.AspNetCore.NodeServices#microsoftaspnetcorenodeservices) package which allows us to easily call out to a JavaScript module from within an ASP.NET Core application.

To our surpise, this not only worked, it was also easy! We created a very simple file called pugcompile.js.

{% codeblock lang:javascript %}

var pug = require('pug');

module.exports = function (callback, viewPath, model) {
	var pugCompiledFunction = pug.compileFile(viewPath);
	callback(null, pugCompiledFunction(model));	
};  

{% endcodeblock %}

Calling this JavaScript from C# is easy thanks to the Node Services package. Assuming `model` is the view model we want to bind to the template and `mytemplate.pug` is the name of the file containing the pug template:

{% codeblock lang:csharp %}
var html = await _nodeServices.InvokeAsync<string>("pugcompile", "mytemplate.pug", model);
{% endcodeblock %}

Now that we had proven this was possible, it was time to integrate this with MVC by creating a new MVC View Engine.

## Creating the Pugzor View Engine
We decided to call our view engine Pugzor which is a combination of Pug and Razor. Of course, this doesn't really make much sense since our view engine really has nothing to do with Razor but naming is hard and we thought we were being funny.

Keeping in mind our goal of implenting a view engine in a single day, we wanted to do this with the simplest way possible. After spending some time digging through the source code for MVC, we determined that we needed to implement the `IViewEngine` interface as well as implement a custom `IView`. 

The `IViewEngine` is responsible for locating a view based on a `ActionContext` and a `ViewName`.  When a controller returns a `View`, it is the `IViewEngine`'s `FindView` method that is responsible for finding a view based on some convetions. The `FindView` method returns a `ViewEngineResult` which is a simple class containing a `boolean Success` property indicating whether or not a view was found and an `IView View` property containing the view if it was found. 

{% codeblock lang:csharp %}
/// <summary>
/// Defines the contract for a view engine.
/// </summary>
public interface IViewEngine
{
    /// <summary>
    /// Finds the view with the given <paramref name="viewName"/> using view locations and information from the
    /// <paramref name="context"/>.
    /// </summary>
    /// <param name="context">The <see cref="ActionContext"/>.</param>
    /// <param name="viewName">The name of the view.</param>
    /// <param name="isMainPage">Determines if the page being found is the main page for an action.</param>
    /// <returns>The <see cref="ViewEngineResult"/> of locating the view.</returns>
    ViewEngineResult FindView(ActionContext context, string viewName, bool isMainPage);

    /// <summary>
    /// Gets the view with the given <paramref name="viewPath"/>, relative to <paramref name="executingFilePath"/>
    /// unless <paramref name="viewPath"/> is already absolute.
    /// </summary>
    /// <param name="executingFilePath">The absolute path to the currently-executing view, if any.</param>
    /// <param name="viewPath">The path to the view.</param>
    /// <param name="isMainPage">Determines if the page being found is the main page for an action.</param>
    /// <returns>The <see cref="ViewEngineResult"/> of locating the view.</returns>
    ViewEngineResult GetView(string executingFilePath, string viewPath, bool isMainPage);
}
{% endcodeblock %}

We decided to use the same view location conventions as Razor. That is, a view is located in `Views/{ControllerName}/{ActionName}.pug`.

Here is a simplified version of the FindView method for the `PugzorViewEngine`:

{% codeblock lang:csharp %}
public ViewEngineResult FindView(
    ActionContext actionContext,
    string viewName,
    bool isMainPage)
{
    var controllerName = GetNormalizedRouteValue(actionContext, ControllerKey);
 
    var checkedLocations = new List<string>();
    foreach (var location in _options.ViewLocationFormats)
    {
        var view = string.Format(location, viewName, controllerName);
        if(File.Exists(view))
            return ViewEngineResult.Found("Default", new PugzorView(view, _nodeServices));
        checkedLocations.Add(view);
    }
    return ViewEngineResult.NotFound(viewName, checkedLocations);
}
{% endcodeblock %}

You can view the complete implentation on [GitHub](https://github.com/AspNetMonsters/pugzor/blob/master/src/pugzor.core/PugzorViewEngine.cs).

Next, we created a class called `PugzorView` which implements `IView`. The `PugzorView` takes in a path to a pug template and an instance of `INodeServices`. The MVC framework calls the `IView`'s `RenderAsync` when it is wants the view to be rendered. In this method, we call out to `pugcompile` and then write the resulting HTML out to the view context.

{% codeblock lang:csharp %}
public class PugzorView : IView
{
    private string _path;
    private INodeServices _nodeServices;

    public PugzorView(string path, INodeServices nodeServices)
    {
        _path = path;
        _nodeServices = nodeServices;
    }

    public string Path
    {
        get
        {
            return _path;
        }
    }

    public async Task RenderAsync(ViewContext context)
    {
        var result = await _nodeServices.InvokeAsync<string>("./pugcompile", Path, context.ViewData.Model);
        context.Writer.Write(result);
    }
}
{% endcodeblock %}

The only thing left was to configure MVC to use our new view engine. At first, we thought we could easy add a new view engine using the `AddViewOptions` extension method when adding MVC to the service collection.

{% codeblock lang:csharp %}
services.AddMvc()
        .AddViewOptions(options =>
            {
                options.ViewEngines.Add(new PugzorViewEngine(nodeServices));
            });
{% endcodeblock %}

This is where we got stuck.  We can't add a concrete instance of the `PugzorViewEngine` to the `ViewEngines` collection in the `Startup.ConfigureServices` method because the view engine needs to take part in dependency injection. The `PugzorViewEngine` has a dependency on `INodeServices` and we want that to be injected by ASP.NET Core's dependency injection framework. Luckily, the all knowning Razor master Taylor Mullen was on hand to show us the right way to register our view engine.   

The recommended approach for adding a view engine to MVC is to create a custom setup class that implements `IConfigureOptions<MvcViewOptions>`. The setup class takes in an instance of our `IPugzorViewEngine` via constructor injection. In the configure method, that view engine is added to the list of view engines in the `MvcViewOptions`.

{% codeblock lang:csharp %}
public class PugzorMvcViewOptionsSetup : IConfigureOptions<MvcViewOptions>
{
    private readonly IPugzorViewEngine _pugzorViewEngine;

    /// <summary>
    /// Initializes a new instance of <see cref="PugzorMvcViewOptionsSetup"/>.
    /// </summary>
    /// <param name="pugzorViewEngine">The <see cref="IPugzorViewEngine"/>.</param>
    public PugzorMvcViewOptionsSetup(IPugzorViewEngine pugzorViewEngine)
    {
        if (pugzorViewEngine == null)
        {
            throw new ArgumentNullException(nameof(pugzorViewEngine));
        }

        _pugzorViewEngine = pugzorViewEngine;
    }

    /// <summary>
    /// Configures <paramref name="options"/> to use <see cref="PugzorViewEngine"/>.
    /// </summary>
    /// <param name="options">The <see cref="MvcViewOptions"/> to configure.</param>
    public void Configure(MvcViewOptions options)
    {
        if (options == null)
        {
            throw new ArgumentNullException(nameof(options));
        }

        options.ViewEngines.Add(_pugzorViewEngine);
    }
}
{% endcodeblock %}

Now all we need to do is register the setup class and view engine the `Startup.ConfigureServices` method.

{% codeblock lang:chsarp %}
services.AddTransient<IConfigureOptions<MvcViewOptions>, PugzorMvcViewOptionsSetup>();
services.AddSingleton<IPugzorViewEngine, PugzorViewEngine>();
{% endcodeblock %}

Like magic, we now have a working view engine. Here's a simple example:

#### Controllers/HomeController.cs

{% codeblock lang:csharp %}
public IActionResult Index()
{
    ViewData.Add("Title", "Welcome to Pugzor!");
    ModelState.AddModelError("model", "An error has occurred");
    return View(new { People = A.ListOf<Person>() }); 
}
{% endcodeblock %}

#### Views/Home/Index.pug

{% codeblock %}
block body
	h2 Hello
	p #{ViewData.title} 
	table(class='table')
		thead
			tr
				th Name
				th Title
				th Age
		tbody
			each val in people
				tr
					td= val.firstName
					td= val.title
					td= val.age	
{% endcodeblock %}

#### Result
{% codeblock lang:html %}
<h2>Hello</h2>
<p>Welcome to Pugzor! </p>
<table class="table">
    <thead>
        <tr>
            <th>Name</th>
            <th>Title</th>
            <th>Age</th>
        </tr>
    </thead>
    <tbody>
        <tr><td>Laura</td><td>Mrs.</td><td>38</td></tr>
        <tr><td>Gabriel</td><td>Mr. </td><td>62</td></tr>
        <tr><td>Judi</td><td>Princess</td><td>44</td></tr>
        <tr><td>Isaiah</td><td>Air Marshall</td><td>39</td></tr>
        <tr><td>Amber</td><td>Miss.</td><td>69</td></tr>
        <tr><td>Jeremy</td><td>Master</td><td>92</td></tr>
        <tr><td>Makayla</td><td>Dr.</td><td>15</td></tr>
        <tr><td>Sean</td><td>Mr. </td><td>5</td></tr>
        <tr><td>Lillian</td><td>Mr. </td><td>3</td></tr>
        <tr><td>Brandon</td><td>Doctor</td><td>88</td></tr>
        <tr><td>Joel</td><td>Miss.</td><td>12</td></tr>
        <tr><td>Madeline</td><td>General</td><td>67</td></tr>
        <tr><td>Allison</td><td>Mr. </td><td>21</td></tr>
        <tr><td>Brooke</td><td>Dr.</td><td>27</td></tr>
        <tr><td>Jonathan</td><td>Air Marshall</td><td>63</td></tr>
        <tr><td>Jack</td><td>Mrs.</td><td>7</td></tr>
        <tr><td>Tristan</td><td>Doctor</td><td>46</td></tr>
        <tr><td>Kandra</td><td>Doctor</td><td>47</td></tr>
        <tr><td>Timothy</td><td>Ms.</td><td>83</td></tr>
        <tr><td>Milissa</td><td>Dr.</td><td>68</td></tr>
        <tr><td>Lekisha</td><td>Mrs.</td><td>40</td></tr>
        <tr><td>Connor</td><td>Dr.</td><td>73</td></tr>
        <tr><td>Danielle</td><td>Princess</td><td>27</td></tr>
        <tr><td>Michelle</td><td>Miss.</td><td>22</td></tr>
        <tr><td>Chloe</td><td>Princess</td><td>85</td></tr>
    </tbody>
</table>
{% endcodeblock %}

All the features of pug work as expected, including templage inheritance and inline JavaScript code. Take a look at our [test website](https://github.com/AspNetMonsters/pugzor/tree/master/test/pugzore.website) for some examples.

## Packaging it all up
So we reached our goal of creating an alternate view engine for MVC in a single day. We had some time left so we thought we would try to take this one step further and create a NuGet package. There were some challenges here, specifically related to including the required node modules in the NuGet package. Simon is planning to write a separate blog post on that topic.

You can give it a try yourself. Add a reference to the `pugzor.core` NuGet package then call `.AddPugzor()` after `.AddMvc()` in the `Startup.ConfigureServices` method.

{% codeblock lang:chsarp %}
public void ConfigureServices(IServiceCollection services)
{
    // Add framework services.
    services.AddMvc().AddPugzor();
}
{% endcodeblock %}

Razor still works as the default but if no Razor view is found, the MVC framework will try using the PugzorViewEngine. If a matching pug template is found, that template will be rendered. 

![Pugzor](http://www.davepaquette.com/images/pugzor.png)

## Wrapping it up
We had a blast working on this project. While this started out as a silly excercise, we sort of ended up with something that could be useful. We were really surprised at how easy it was to create a new view engine for MVC. We don't expect that Pugzor will be wildly popular but since it works we thought we would put it out there and see what people think. 

We have some [open issues](https://github.com/AspNetMonsters/pugzor/issues) and some ideas for how to extend the `PugzorViewEngine`. Let us know what you think or jump in and contribute some code. We accept pull requests :-) 

