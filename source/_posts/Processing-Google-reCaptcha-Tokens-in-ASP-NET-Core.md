title: Processing Google reCaptcha Tokens in ASP.NET Core
layout: post
tags:
  - ASP.NET Core
  - Visual Studio 2019
  - reCaptcha
  - Web API
categories:
  - Development
  - Monsters Weekly
authorId: james_chambers
featureImage: logo_579.png
originalUrl: 'http://jameschambers.com/2020/11/Processing-Google-reCaptcha-Tokens-in-ASP-NET-Core'
date: 2020-11-29 08:26:04
---

Integrating a simple test to help prevent malignant input on your site is as simple as integrating a few lines of code into your website.

Now, if I could I'd pinch myself to make sure I'm not a robot, but I know very well that if I'm smart enough to think of that, they must have also programmed a sense of touch and pain into me as well. So testing to see if a website user is going to be even more daunting, because we can't even pinch _them_. 

Thankfully, the [reCaptcha service](https://www.google.com/recaptcha/about/) offered by Google is free add-on to your site that will help to avoid bad data getting into your site, prevent malicious users from gaining access to your resources, and helping you to avoid unwanted side effects of bots that pile up junk data through your forms.

Read on to see how to get this all wired up in a Razor Pages application in ASP.NET Core. Heck, if you are in an MVC app or are building a Web API (or Azure Function) this would all still serve useful!

<!-- more -->

## The Way it Works

Here's how it works: actually, we don't know. Google holds their cards pretty close. The thing is, the more anyone knows about the service, the easier it is for the bad peeps to figure out a way to bypass it. So, as far as the actual "non-robot" side of things goes, we're going to leave that part to the perfectly capable engineers at Google.

**However**, we can certainly use the service without having to know it's technical innards. The important part is that some client side code will help us to generate a token through the reCaptcha service using a client secret that is only valid for the domains we specify. Then, we can  use that token to verify that it was approved by reCaptcha on our server with a different, private key, that we and only we know and can use to validate the token.

And those are the key principles: a client-side token and a back-end verification of said token.

## How to Use It
First, pop over to [reCaptcha](https://www.google.com/recaptcha/about/), sign in and go to the Admin Console. From there you can create or manage sites. I chose the "invisible" implementation because it's fairly non-invasive but it is still able to provide a great level of protection to my site.

There are actually pretty good docs once you generate your keys, namely:

 - [Client Side Integration](https://developers.google.com/recaptcha/docs/invisible)
 - [Server Side Integration](https://developers.google.com/recaptcha/docs/verify)

But those docs are implementation agnostic, so we'll have a look at how to get things going in a Razor Pages application. What we need to do in the Razor Pages and ASP.NET space is something like this:

1. Add user secrets
1. Create a service that can be injected into our view
1. Update our startup to read the config and use the service
1. Update our view to include the script and configuration
1. Update our page code to setup the client key as well as to process the token

### Add User Secrets and Update Application Config

We don't want to put our secrets into source control lest the directory be public or otherwise exposed. I like to create a placeholder in my `appsettings.json` file for the data like so:

```
  "Captcha": {
    "ClientKey": "",
    "ServerKey": ""
  }
```

Now, whenever someone on my team (or me, on a different computer) pulls down the source code it's easy to copy and paste the configuration section into my user secrets, which are never added to the repo.

Now, right-click on your project in Visual Studio and choose "Manage User Secrets", then copy and paste the above into the root of the JSON document. Fill in the keys with the secrets from your Google configuration. 

It's also a good idea at this time to update your staging and production environments, or any build automation steps or key stores where you would need these settings. Remember that the end result is a key-value pair, so the JSON nesting should be removed before you set a key somewhere and the key should be the composite of all property names in the path assembled with colon. What I mean by that is that our settings above will be `Captcha:ClientKey` and `Captcha:ServerKey` when you add them to your other environments. 

The second side of the configuration is the ability to work with the data in a POCO. We create a class for this so that we can take advantage of the [options pattern](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options?view=aspnetcore-5.0). The class looks like this:

```
public class CaptchaSettings
{
    public string ClientKey { get; set; }
    public string ServerKey { get; set; }
}
```

Two simple properties in a class. Easy-peasy.

### A `CaptchaVerificationService` Service

Here is the complete listing of the service I've created to handle the verifications. I have chosen to have a `false` result by default in the event of a service verification failure or other communication exception, but you can choose a default that best suits your needs.

```
public class CaptchaVerificationService
{
    private CaptchaSettings captchaSettings;
    private ILogger<CaptchaVerificationService> logger;

    public string ClientKey => captchaSettings.ClientKey;

    public CaptchaVerificationService(IOptions<CaptchaSettings> captchaSettings, ILogger<CaptchaVerificationService> logger)
    {
        this.captchaSettings = captchaSettings.Value;
        this.logger = logger;
    }

    public async Task<bool> IsCaptchaValid(string token)
    {
        var result = false;

        var googleVerificationUrl = "https://www.google.com/recaptcha/api/siteverify";

        try
        {
            using var client = new HttpClient();

            var response = await client.PostAsync($"{googleVerificationUrl}?secret={captchaSettings.ServerKey}&response={token}", null);
            var jsonString = await response.Content.ReadAsStringAsync();
            var captchaVerfication = JsonConvert.DeserializeObject<CaptchaVerificationResponse>(jsonString);

            result = captchaVerfication.success;
        }
        catch (Exception e)
        {
            // fail gracefully, but log
            logger.LogError("Failed to process captcha validation", e);
        }

        return result;
    }
}
```

### Wiring up the Configuration and Services

Next up, head over to your `Startup` class and pop into your `ConfigureServices` method to add these two lines:

```
services.AddOptions<CaptchaSettings>().BindConfiguration("Captcha");
services.AddTransient<CaptchaVerificationService>();
```

The first line pulls the configuration from your key store, configuration file or user secrets, depending on your environment. The second just makes our little verification class available for dependency injection.

### Add Assets and Configuration to our View 

Our view will have to be updated to integrate some code from the sample on the reCaptcha site. We'll include the script from Google, and add a callback that submits our form. This code is in my `cshtml` view containing a form where I want the captcha to appear.

```
<script src="https://www.google.com/recaptcha/api.js" async defer></script>
<script>
       function onSubmit(token) {
           document.getElementById("email-form").submit();
       }
</script>
```

Next, we update the submit button in the view to include a few properties that help the script understand what kind of captcha we're generating and to specify the callback.

```
<button class="g-recaptcha" data-sitekey="@Model.CaptchaClientKey" data-callback='onSubmit'>Keep me posted!</button>
```

You'll notice in there the client key...this is why we took advantage of the `IOptions` bits and exposed it through the service. It's part of the page model for simplicity, and we just load it up on the `get` request in the next step.

### Checking the Final Boxes

That was a captcha pun, in case you missed it.

Anyway, the last step is to add a bit of code to our page's `.cs` file. Let's start with the class-level field for the service reference and the property we expose through our page model.

```
private readonly CaptchaVerificationService verificationService;
public string CaptchaClientKey { get; set; }
```

As well we're going to need to capture the token from our form on the way back from the view to the server. The field is named in a non-CLR way, so we use the `Name` property on our binding to tie it to the way Google names the token in the client script.

```
[BindProperty(Name = "g-recaptcha-response")]
public string CaptchaResponse {get;set;}
```

Our constructor also needs some massaging. My page is called `Index` so appropriately my class is called `IndexModel`. 

```
public IndexModel(CaptchaVerificationService verificationService)
    {
        this.verificationService = verificationService;
    }
```

And, finally, our `OnPost` method needs to include the service check before proceeding with any data processing.

```
public async Task OnPost()
{
    // validate input
    var requestIsValid = await this.verificationService.IsCaptchaValid(CaptchaResponse);

    if (requestIsValid)
    {
        // do your processing...
    }
}
```

## Ship it!
Stitching together all of the parts takes a bit of work on the first pass, but once the config and service are in place, it literally only takes a couple of minutes to wire up your views (pages, controllers, etc.). reCaptcha is a pretty slick addition to your site that can help prevent script kiddies, bots and purveyors of evil from fluffing with your data. Because no one likes getting their data fluffed.

Happy coding!
