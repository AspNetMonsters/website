---
layout: post
title: Authorize Resource Tag Helper for ASP.NET Core
tags:
  - ASP.NET Core
  - MVC
  - Tag Helpers
  - Authorization
categories:
  - Development 
authorId: dave_paquette
originalurl: 'https://www.davepaquette.com/archive/2017/11/28/authorize-resource-tag-helper.aspx'
date: 2017-11-28 20:30
excerpt: ASP.NET Core has a powerful mechanism for implementing resource-based authorization using the IAuthorizationService and resource-based AuthorizationHandlers. In this blog post, we build a tag helper that makes it simple to use resource-based auhtorization to Razor views without writing any C# code in the view.
---
In my previous blog post, I wrote an [Authorize tag helper](https://www.davepaquette.com/archive/2017/11/05/authorize-tag-helper.aspx) that made it simple to use role and policy based authorization in Razor Views. In this blog post, we will take this one step further and build a tag helper for resource-based authorization.

# Resource-Based Authorization
Using the `IAuthorizationService` in ASP.NET Core, it is easy to implement an authorization strategy that depends not only on properties of the User but also depends on the resource being accessed. To learn how resource-based authorization works, take a look at the well written [offical documentation](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased?tabs=aspnetcore2x).

Once you have defined your authorization handlers and setup any policies in `Startup.ConfigureServices`, applying resource-based authorization is a matter of calling one of two overloads of the `AuthorizeAsync` method on the `IAuthorizationService`.

{% codeblock lang:csharp %}
Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user,
                          object resource,
                          string policyName);

Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user,
                          object resource,
                          IAuthorizationRequirement requirements);
{% endcodeblock %}                          

One method takes in a policy name while the other takes in an `IAuthorizationRequirement`. The resulting `AuthorizationResult` has a `Succeeded` boolean that indicates whether or not the user meets the requirements for the specified policy. Using the `IAuthorizationService` in a controller is easy enough. Simply inject the service into the controller, call the method you want to call and then check the result.

{% codeblock lang:chsarp %} 
public async Task<IActionResult> Edit(int id)
{
    var document = _documentContext.Find(documentId);

    var authorizationResult = await _authorizationService.AuthorizeAsync(User, Document, "EditDocument");

    if (authorizationResult.Succeeded)
    {
        return View(document);
    }    
    else
    {
        return new ChallengeResult();
    }
}
{% endcodeblock %}

Using this approach, we can easily restrict which users can edit specific documents as defined by our EditDocument policy. For example, we might limit editing to only users who originally created the document. 

Where things start to get a little ugly is if we want to render a UI element based on resource-based authorization. For example, we might only want to render the edit button for a document if the current user is actually authorized to edit that document. Out of the box, this would require us to inject the `IAuthorizationService` in the Razor view and use it like we did in the controller action. The approach works, but the Razor code will get ugly really fast.

# Authorize Resource Tag Helper

Similar to the Authorize Tag Helper from the last blog post, this Authorize Resource Tag Helper will make it easy to show or hide blocks of HTML by evaluating authorization rules.

## Resource-Based Policy Authorization
Let's assume we have a named "EditDocument" that requires a user to be the original author of a `Document` in order to edit the document. With the authorize resource tag helper, specify the resource instance using the `asp-authorize-resource` attribute and the policy name using the `asp-policy` attribute. Here is an example where `Model` is an instance of a `Document`

{% codeblock lang:html %}
<a href="#" asp-authorize-resource="Model" 
    asp-policy="EditDocument" class="glyphicon glyphicon-pencil"></a>
{% endcodeblock %}

If the user meets the requirments for the "EditDocument" policy and the specified resource, then the block of HTML will be sent to the browser. If the requirements are not met, the tag helper will suppress the output of that block of HTML. The tag helper can be applied to any HTML element.

## Resource-Based Requirement Authorization
Instead of specifying a policy name, authorization can be evaluated by specifying an instance of an `IAuthorizationRequirement`. When using requirements directly instead of policies, specify the requirement using the `asp-requirement` attribute.

{% codeblock lang:html %}
<a href="#" asp-authorize-resource="document"
            asp-requirement="Operations.Delete" 
            class="glyphicon glyphicon-trash text-danger">                            
</a>
{% endcodeblock %}

If the user meets `Operations.Delete` requirement for the specified resource, then the block of HTML will be sent to the browser. If the requirement is not met, the tag helper will suppress the output of that block of HTML. The tag helper can be applied to any HTML element.


## Implementation Details
The authorize resource tag helper itself is fairly simple. The implementation will likely evolve after this blog post so you can check out the latest version [here](https://github.com/dpaquette/TagHelperSamples/blob/master/TagHelperSamples/src/TagHelperSamples.Authorization/AuthorizeResourceTagHelper.cs).

The tag helper needs an instance of the `IHttpContextAccessor` to get access to the current user and an instance of the `IAuthorizationService`. These are injected into the constructor. In the `ProcessAsync` method, either the specified `Policy` or the specified `Requirement` are passed in to the `IAuthorizationService` along with the resource.

{% codeblock lang:csharp %}
[HtmlTargetElement(Attributes = "asp-authorize-resource,asp-policy")]
[HtmlTargetElement(Attributes = "asp-authorize-resource,asp-requirement")]
public class AuthorizeResourceTagHelper : TagHelper
{
    private readonly IAuthorizationService _authorizationService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuthorizeResourceTagHelper(IHttpContextAccessor httpContextAccessor, IAuthorizationService authorizationService)
    {
        _httpContextAccessor = httpContextAccessor;
        _authorizationService = authorizationService;
    }

    /// <summary>
    /// Gets or sets the policy name that determines access to the HTML block.
    /// </summary>
    [HtmlAttributeName("asp-policy")]
    public string Policy { get; set; }

    /// <summary>
    /// Gets or sets a comma delimited list of roles that are allowed to access the HTML  block.
    /// </summary>
    [HtmlAttributeName("asp-requirement")]
    public IAuthorizationRequirement Requirement { get; set; }


    /// <summary>
    /// Gets or sets the resource to be authorized against a particular policy
    /// </summary>
    [HtmlAttributeName("asp-authorize-resource")]
    public object Resource { get; set; }

    public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
    {
        if (Resource == null)
        {
            throw new ArgumentException("Resource cannot be null");                
        }
        if (string.IsNullOrWhiteSpace(Policy) && Requirement == null)
        {
            throw new ArgumentException("Either Policy or Requirement must be specified");
                
        }
        if (!string.IsNullOrWhiteSpace(Policy) && Requirement != null)
        {
            throw new ArgumentException("Policy and Requirement cannot be specified at the same time");
        }

        AuthorizationResult authorizeResult;

        if (!string.IsNullOrWhiteSpace(Policy))
        {
            authorizeResult = await _authorizationService.AuthorizeAsync(_httpContextAccessor.HttpContext.User, Resource, Policy);
        }
        else if (Requirement != null)
        {
            authorizeResult =
                await _authorizationService.AuthorizeAsync(_httpContextAccessor.HttpContext.User, Resource,
                    Requirement);
        }
        else
        {
            throw new ArgumentException("Either Policy or Requirement must be specified");
        }

        if (!authorizeResult.Succeeded)
        {
            output.SuppressOutput();
        }
    }
{% endcodeblock %} 

Note that either a policy or a requirement must be specified along with a resource, but you can't specify both a policy AND a requirement. Most of the code in the `ProcessAsync` method is checking the argument values to make sure a valid combination was used.

# Try it out
You can see the authorize resource tag helper in action on my tag helper samples site [here](http://taghelpersamples.azurewebsites.net/Samples/Authorize). The sample site contains the examples listed in this blog post and also provides a way to log in as different users to test different scenarios.

The authorize resource tag helper is also available on [NuGet](https://www.nuget.org/packages/TagHelperSamples.Authorization/) so you can use it in your own ASP.NET Core application.

```
dotnet add package TagHelperSamples.Authorization
```

Let me know what you think. Would you like to see this tag helper including in the next release of ASP.NET Core?

*NOTE:* If you choose to use the authorize resource tag helper in your application, you should remember that hiding a section of HTML is not enough to fully secure your application. You also need to make sure that resource-based authorization is applied to any related controllers and action methods.


# What's Next?

There is one more authorization scenario related to supporting different authorization schemes that I hope to cover. Watch out for that in a future blog post. Also, this tag helper project is all open source so feel free to jump in on [GitHub](https://github.com/dpaquette/TagHelperSamples).