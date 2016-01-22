title: Feature Folders in ASP.net Core MVC 1
categories:
  - MVC 6
tags:
  - ASP.NET MVC
  - ASP.NET CORE 1
  - MVC 6
  - VS 2015
  - Tag Helpers
date: 2016-01-22 06:45:00
authorId: simon_timms
---

A couple of Prairie Dev Cons ago I went to a talk by Jimmy Bogard in which, amongst other things, he talked about MediatR. Fast forward a couple of years and I find myself on projects which make use of MediatR like Martha Stewart uses a glue gun(quite a lot). I really like it because it moves the logic out of your controller and into services. This leaves the controllers almost empty except for dealing with talking to the views - a single responsibility. 

We end up with a controllers directory and a features directory. In the features directory is a directory for each "feature" in our application. So we might have a folder for login, a folder for search, and a folder for user list. In the folders we typically have 

 - A view model class
 - A read query
 - A read query handler
 - A command model
 - A command handler
 
 The workflow is that a user hits the list page action on the controller. The controller builds a read query which might only contain the Id from the URL, and passes it to MediatR. MediatR finds the query handler and pass it the message. The handler does its thing and returns the view model which we pass back to the view. 
 
 ````
 HttpRequest -> Controller -> Ready Query -> MediatR -> Read Query Handler -> View Model -> Controller -> View
 ````
 
 Now the user changes something and submits the form. Again it returns to the controller which builds the command, passes it to the command handler which does its thing and may, optionally the handler may return an additional view model. 
 
 ````
 HttpRequest -> Controller -> Command -> MediatR -> Command Handler -> View Model -> Controller -> View
 ````
 
 My one complaint about using this approach is that I end up bouncing around the directory structure a lot when dealing with a feature. The controller is in one place, the feature stuff in another and the view in a third place. Ugh. 
 
 ASP.net Core MVC 1 offers a quite palatable solution to this problem. The first part of the solution is that controllers can be anywhere in the project now. So we can put it directly into the feature directory. 
 
 The second part is to move the views into the feature directory. This is, only slightly, more complicated. ASP.net MVC Core by default examines a few places for views. You can see the code [here](https://github.com/aspnet/Mvc/blob/6df288bce7dc94c6afbeecc9260831bcea1c638d/src%2FMicrosoft.AspNet.Mvc.Razor%2FRazorViewEngine.cs) but in short 
 
 - /Views/{controller}/{action}.cshtml
 - /Views/Shared/{action}.cshtml
 - /Areas/{area}/Views/{controller}/{action}.cshtml
 - /Areas/{area}/Views/Shared/{action}.cshtml
 
 This list is passed to an implementation of `IViewLocationExpander` which can perform some post processing of the list adding additional search locations. You an see a great implementation of `IViewLocationExpander` in the `LanguageViewLocationExpander` located [here](https://github.com/aspnet/Mvc/blob/91aeec95e99c006c99f675e2ba887d4ed731532a/src/Microsoft.AspNet.Mvc.Razor/LanguageViewLocationExpander.cs). This particular implementation adds support for localized views. 
 
 We can create our own implementation which allows for the feature directory to be used as a source of views.
 
 {% codeblock lang:csharp %}
  public class FeatureViewLocationExpander : IViewLocationExpander
    {
        public IEnumerable<string> ExpandViewLocations(ViewLocationExpanderContext context, IEnumerable<string> viewLocations)
        {
            var controllerActionDescriptor = (context.ActionContext.ActionDescriptor as ControllerActionDescriptor);
            if (controllerActionDescriptor != null && controllerActionDescriptor.ControllerTypeInfo.FullName.Contains("Features"))
                return new List<string> { GetFeatureLocation(controllerActionDescriptor.ControllerTypeInfo.FullName) };
            return viewLocations;
        }

        private string GetFeatureLocation(string fullControllerName)
        {
            var words = fullControllerName.Split('.');
            var path = "";
            bool isInFeature =false;
            foreach(var word in words.Take(words.Count() - 1))
            {
                if (word.Equals("features", StringComparison.CurrentCultureIgnoreCase))
                    isInFeature = true;
                if (isInFeature)
                    path = System.IO.Path.Combine(path, word);
            }
            return System.IO.Path.Combine(path, "views", "{0}.cshtml");
        }

        public void PopulateValues(ViewLocationExpanderContext context)
        {
            
        }
    }
 {% endcodeblock %}
 
With this code in place we can open up our familiar `Startup.cs` and hook up the new `IViewLocationExpander`. Right now this can be done by doing 
 
{% codeblock lang:csharp %}
services.Configure<RazorViewEngineOptions>(options =>
{
    options.ViewLocationExpanders.Add(new FeatureViewLocationExpander());
});
{% endcodeblock %}
 but with RC2 you'll need to do
 
{% codeblock lang:csharp %}
 var razorViewEngineOptions = new RazorViewEngineOptions();
            //razorViewEngineOptions.ViewLocationExpanders.Add(new FeatureViewLocationExpander());
            //services.Configure<RazorViewEngineOptions>(razorViewEngineOptions);
{% endcodeblock %}
 
 We can now put our views closer to the rest of the related code and avoid the pain of jumping about a bunch.
 
 ![A feature](http://i.imgur.com/4ONe5xz.jpg)
 
 Using this same approach you could point your views to any place within the project. I'm sure you'll come up with better ideas than me.