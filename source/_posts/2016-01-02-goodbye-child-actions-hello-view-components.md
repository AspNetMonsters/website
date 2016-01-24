---
layout: post
title: Goodbye Child Actions, Hello View Components
tags:
  - ASP.NET Core
  - MVC 6
  - View Components
categories:
  - ASP.NET Core
  - View Components
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2016/01/02/goodbye-child-actions-hello-view-components.aspx'
date: 2016-01-02 10:42:41
excerpt: In previous versions of MVC, we used Child Actions to build reusable components. Child Actions do not exist in MVC 6. Instead, we are encouraged to use the new View Component feature to support this use case.
---
In previous versions of MVC, we used [Child Actions](http://haacked.com/archive/2009/11/18/aspnetmvc2-render-action.aspx/) to build reusable components / widgets that consisted of both Razor markup and some backend logic. The backend logic was implemented as a controller action and typically marked with a `[ChildActionOnly]` attribute. Child actions are extremely useful but as some have pointed out, it is easy to [shoot yourself in the foot](http://www.khalidabuhakmeh.com/obscure-bugs-asp-net-mvc-child-actions). 

**Child Actions do not exist in MVC 6**. Instead, we are encouraged to use the new View Component feature to support this use case. Conceptually, view components are a lot like child actions but they are a lighter weight and no longer involve the lifecycle and pipeline related to a controller. Before we get into the differences, let's take a look at a simple example.

# A simple View Component
View components are made up of 2 parts: A view component class and a razor view.

To implement the view component class, inherit from the base `ViewComponent` and implement an `Invoke` or `InvokeAsync` method. This class can be anywhere in your project. A common convention is to place them in a ViewComponents folder. Here is an example of a simple view component that retrieves a list of articles to display in a _What's New_ section.

{% codeblock lang:csharp %}
namespace MyWebApplication.ViewComponents
{
    public class WhatsNewViewComponent : ViewComponent
    {
        private readonly IArticleService _articleService;

        public WhatsNewViewComponent(IArticleService articleService)
        {
            _articleService = articleService;
        }

        public IViewComponentResult Invoke(int numberOfItems)
        {
            var articles = _articleService.GetNewArticles(numberOfItems);
            return View(articles);
        }
    }
}
{% endcodeblock %}

Much like a controller action, the Invoke method of a view component simply returns a view. If no view name is explicitly specified, the default `Views\Shared\Components\ViewComponentName\Default.cshtml` is used. In this case, `Views\Shared\Components\WhatsNew\Default.cshtml`. Note there are a ton of conventions used in view components. I will be covering these in a future blog post.

{% codeblock "Views\\Shared\\Components\\WhatsNew\\Default.cshtml" lang:html %}
@model IEnumerable<Article>

<h2>What's New</h2>
<ul>
@foreach (var article in Model)
{
    <li><a asp-controller="Article" 
           asp-action="View" 
           asp-route-id="@article.Id">@article.Title</a></li>
}
</ul>
{% endcodeblock %}

To use this view component, simply call `@Component.Invoke` from any view in your application. For example, I added this to the Home/Index view:
{% codeblock "Views\\Home\\Index.cshtml" lang:html %}
<div class="col-md-3">
    @Component.Invoke("WhatsNew", 5)
</div>
{% endcodeblock %}

The first parameter to `@Component.Invoke` is the name of the view component. Any additional parameters will be passed to the `Invoke` method that has a matching signature. In this case, we specified a single `int`, which matches the `Invoke(int numberOfItems)` method of the `WhatsNewViewComponent` class.

![What's New View Component](http://www.davepaquette.com/images/whats-new-view-component.png)

## How is this different?

So far this doesn't really look any different from what we had with Child Actions. There are however some major differences here. 

### No Model Binding
With view components, parameters are passed directly to your view component when you call `@Component.Invoke()` or `@Component.InvokeAsync()` in your view. There is no model binding needed here since the parameters are not coming from the HTTP request. You are calling the view component directly using C#. No model binding means you can have overloaded `Invoke` methods with different parameter types. This is something you can't do in controllers.

### No Action Filters
View components don't take part in the controller lifecycle. This means you can't add action filters to a view component. While this might sound like a limitation, it is actually an area that caused problems for a lot of people. Adding an action filter to a child action would sometimes have unintended consequences when the child action was called from certain locations. 

### Not reachable from HTTP

A view component never directly handles an HTTP request so you can't call directly to a view component from the client side. You will need to wrap the view component with a controller if your application requires this behaviour.

## What is available?

### Common Properties
When you inherit from the base `ViewComponent` class, you get access to a few properties that are very similar to controllers:

{% codeblock lang:csharp %}
[ViewComponent]
public abstract class ViewComponent
{
    protected ViewComponent();
    public HttpContext HttpContext { get; }
    public ModelStateDictionary ModelState { get; }
    public HttpRequest Request { get; }
    public RouteData RouteData { get; }
    public IUrlHelper Url { get; set; }
    public IPrincipal User { get; }
    
    [Dynamic]    
    public dynamic ViewBag { get; }
    [ViewComponentContext]
    public ViewComponentContext ViewComponentContext { get; set; }
    public ViewContext ViewContext { get; }
    public ViewDataDictionary ViewData { get; }
    public ICompositeViewEngine ViewEngine { get; set; }

    //...
}
{% endcodeblock %}

Most notably, you can access information about the current user from the `User` property and information about the current request from the `Request` property. Also, route information can be accessed from the `RouteData` property. You also have the `ViewBag` and `ViewData`. Note that the ViewBag / ViewData are shared with the controller. If you set ViewBag property in your controller action, that property will be available in any ViewComponent that is invoked by that controller action's view.
 
### Dependency Injection
Like controllers, view components also take part in dependency injection so any other information you need can simply be injected to the view component. In the example above, we injected the `IArticleService` that allowed us to access articles form some remote source. Anything that you could inject into a controller can also be injected into a view component.

# Wrapping it up
View components are a powerful new feature for creating reusable widgets in MVC 6. Consider using View Components any time you have complex rendering logic that also requires some backend logic. 
 
 
