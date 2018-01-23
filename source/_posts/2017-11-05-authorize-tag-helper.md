---
layout: post
title: Authorize Tag Helper for ASP.NET Core
tags:
  - ASP.NET Core
  - MVC
  - Tag Helpers
  - Authorization
categories:
  - Development 
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2017/11/05/authorize-tag-helper.aspx'
date: 2017-11-05 14:38:30
excerpt: In ASP.NET Core, it's easy to control access to Controllers and Action Methods using the Authorize attribute. This attribute provides a simple way to ensure only authorized users are able to access certain parts of your application. While the Authorize attribute makes it easy to control authorization for an entire page, the mechanism for controlling access to a section of a page is a little clumsy. In this blog post, we build a Tag Helper that makes it incredibly easy to control access to any block HTML in a Razor view.
---
In ASP.NET Core, it's easy to control access to Controllers and Action Methods using the `[Authorize]` attribute. This attribute provides a simple way to ensure only authorized users are able to access certain parts of your application. While the `[Authorize]` attribute makes it easy to control authorization for an entire page, the mechanism for controlling access to a section of a page is [a little clumsy](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/views?tabs=aspnetcore2x), involving the use of a the `IAuthorizationService` and writing C# based `if` blocks in your Razor code.

In this blog post, we build an Authorize tag helper that makes it easy to control access to any block HTML in a Razor view.

# Authorize Tag Helper
The basic idea of this tag helper is to provide similar functionality to the `[Authorize]` attribute and it's associated action filter in ASP.NET Core MVC. The authorize tag helper will provide the same options as the `[Authorize]` attribute and the implementation will be based on the authorize filter. In the MVC framework, the `[Authorize]` attribute provides data such as the names of roles and policies while the authorize filter contains the logic to check for roles and policies as part of the request pipeline. Let's walk through the most common scenarios.

## Simple Authorization
In it's [simplest form](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/simple), adding the `[Authorize]` attribute to a controller or action method will limit access to that controller or action method to users who are authenticated. That is, only users who are logged in will be able to access those controllers or action methods.

With the Authorize tag helper, we will implement a similar behaviour. Adding the `asp-authorize` attribute to any HTML element will ensure that only authenticated users can see that that block of HTML. 

{% codeblock lang:html %}
<div asp-authorize class="panel panel-default">
    <div class="panel-heading">Welcome !!</div>
    <div class="panel-body">
        If you're logged in, you can see this section
    </div>
</div>
{% endcodeblock %}

If a user is not authenticated, the tag helper will suppress the output of that entire block of HTML. That section of HTML will not be sent to the browser.

## Role Based Authorization
The `[Authorize]` attribute provides an option to specify the role that a user must belong to in order to access a controller or action method. For example, if a user must belong to the _Admin_ role, we would add the `[Authorize]` attribute and specify the `Roles` property as follows:

{% codeblock lang:csharp %}
[Authorize(Roles = "Admin")]
public class AdminController : Controller
{
  //Action methods here
}
{% endcodeblock %}

The equivalent using the Authorize tag helper would be to add the `asp-authorize` attribute to an HTML element and then also add the `asp-roles` attribute specifying the require role.

{% codeblock lang:html %}
<div asp-authorize asp-roles="Admin" class="panel panel-default">
    <div class="panel-heading">Admin Section</div>
    <div class="panel-body">
        Only admin users can see this section. Top secret admin things go here.
    </div>
</div>
{% endcodeblock %}

You can also specify a comma separated list of roles, in which case the HTML would be rendered if the user was a member of any of the roles specified.

## Policy Based Authorization
The `[Authorize]` attribe also provides an option to authorize users based on the requirements specified in a Policy. You can learn more about the specifics of this approach by reading the offical docs on [Claims-Based Authorization](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/claims) and [Custom-Policy Based Authorization](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/policies). Policy based authorization is applied by specifying `Policy` property for the `[Authorize]` attribute as follows:

{% codeblock lang:csharp %}
[Authorize(Policy = "Seniors")]
public class AdminController : Controller
{
  //action methods here
}
{% endcodeblock %}

This assumes a policy named _Seniors_ was defined at startup. For example:

{% codeblock lang:csharp %}
services.AddAuthorization(o =>
    {
        o.AddPolicy("Seniors", p =>
        {
            p.RequireAssertion(context =>
            {
                return context.User.Claims
                      .Any(c => c.Type == "Age" && Int32.Parse(c.Value) >= 65);
            });
        });

    }
);
{% endcodeblock %}

The equivalent using the Authorize tag helper would be to add the `asp-authorize` attribute to an HTML element and then also add the `asp-policy` attribute specifying the policy name.

{% codeblock lang:html %}
<div asp-authorize asp-policy="Seniors" class="panel panel-default">
    <div class="panel-heading">Seniors Only</div>
    <div class="panel-body">
        Only users age 65 or older can see this section. Early bird dinner coupons go here. 
    </div>
</div>
{% endcodeblock %}

## Combining Role and Policy Based Authorization
You can combine the role based and policy based approaches by specifying both the `asp-roles` and `asp-policy` attributes. This has the effect of requiring that the user meets the requiremnts for both the role and the policy. For example, the following would require that the usere were both a member of the Admin role and meets the requirements defined in the Seniors policy.

{% codeblock lang:html %}
<div asp-authorize asp-roles="Admin" asp-policy="Seniors" class="panel panel-default">
    <div class="panel-heading">Admin Seniors Only</div>
    <div class="panel-body">
        Only users who have both the Admin role AND are age 65 or older can see this section.
    </div>
</div>
{% endcodeblock %}

## Implementation Details
The Authorize tag helper itself is fairly simple. The implementation will likely evolve after this blog post so you can check out the latest version [here](https://github.com/dpaquette/TagHelperSamples/blob/master/TagHelperSamples/src/TagHelperSamples.Authorization/AuthorizeTagHelper.cs).

The tag helper implements the `IAuthorizeData` interface. This is the interface implemented by the [Authorize](https://github.com/aspnet/Security/blob/dev/src/Microsoft.AspNetCore.Authorization/AuthorizeAttribute.cs) attribute in ASP.NET Core. In the `ProcessAsync` method, the properties of `IAuthorizeData` are used to create an effective policy that is then evaluated against the current `HttpContext`. If the policy does not succeed, then the output of the tag helper is supressed. Remember that supressing the output of a tag helper means that the HTML for that element, including it's children, will be NOT sent to the client.

{% codeblock lang:csharp %}
[HtmlTargetElement(Attributes = "asp-authorize")]
[HtmlTargetElement(Attributes = "asp-authorize,asp-policy")]
[HtmlTargetElement(Attributes = "asp-authorize,asp-roles")]
[HtmlTargetElement(Attributes = "asp-authorize,asp-authentication-schemes")]
public class AuthorizationPolicyTagHelper : TagHelper, IAuthorizeData
{
    private readonly IAuthorizationPolicyProvider _policyProvider;
    private readonly IPolicyEvaluator _policyEvaluator;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuthorizationPolicyTagHelper(IHttpContextAccessor httpContextAccessor, IAuthorizationPolicyProvider policyProvider, IPolicyEvaluator policyEvaluator)
    {
        _httpContextAccessor = httpContextAccessor;
        _policyProvider = policyProvider;
        _policyEvaluator = policyEvaluator;
    }

    /// <summary>
    /// Gets or sets the policy name that determines access to the HTML block.
    /// </summary>
    [HtmlAttributeName("asp-policy")]
    public string Policy { get; set; }

    /// <summary>
    /// Gets or sets a comma delimited list of roles that are allowed to access the HTML  block.
    /// </summary>
    [HtmlAttributeName("asp-roles")]
    public string Roles { get; set; }

    /// <summary>
    /// Gets or sets a comma delimited list of schemes from which user information is constructed.
    /// </summary>
    [HtmlAttributeName("asp-authentication-schemes")]
    public string AuthenticationSchemes { get; set; }
    
    public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
    {
        var policy = await AuthorizationPolicy.CombineAsync(_policyProvider, new[] { this });

        var authenticateResult = await _policyEvaluator.AuthenticateAsync(policy, _httpContextAccessor.HttpContext);

        var authorizeResult = await _policyEvaluator.AuthorizeAsync(policy, authenticateResult, _httpContextAccessor.HttpContext, null);

        if (!authorizeResult.Succeeded)
        {
            output.SuppressOutput();
        }
    }
}
{% endcodeblock %} 

The code in the `ProcessAsync` method is based on the [AuthorizeFilter](https://github.com/aspnet/Mvc/blob/dev/src/Microsoft.AspNetCore.Mvc.Core/Authorization/AuthorizeFilter.cs) from ASP.NET Core MVC.

# Try it out
You can see the Authorize tag helper in action on my tag helper samples site [here](http://taghelpersamples.azurewebsites.net/Samples/Authorize). The sample site contains the examples listed in this blog post and also provides a way to log in as different users to test different scenarios.

The Authorize tag helper is also available on [NuGet](https://www.nuget.org/packages/TagHelperSamples.Authorization/) so you can use it in your own ASP.NET Core application.

```
dotnet add package TagHelperSamples.Authorization
```

Let me know what you think. Would you like to see this tag helper included in the next release of ASP.NET Core?

# What's Next?
If you choose to use the Authorize tag helper in your application, you should remember that hiding a section of HTML is not enough to fully secure your application. You also need to make sure that authorization is applied to any related controllers and action methods. The Authorize tag helper is meant to be used in conjugtion with the `[Authorize]` attribute, not as a replacement for it.

There are a couple more scenarios I would like to go through and I will address those in a future post. One of those is supporting different Authorization Schemes and the other resource based authorization. Of course, this project is all open source so feel free to jump in on [GitHub](https://github.com/dpaquette/TagHelperSamples).