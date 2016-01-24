title: Writing Custom Commands for DNX with ASP.NET 5.0
tags:
  - ASP.NET Core
  - VS 2015
id: 7531
categories:
  - Code Dive
date: 2015-08-11 02:30:07
authorId: james_chambers
originalurl: http://jameschambers.com/2015/08/writing-custom-commands-for-dnx-with-asp-net-5-0/
---

If you are a developer on the .NET stack, you’ve now got access to a great new extension to your development environment. DNX, or the .NET Execution Environment, is a powerful new extensibility point that you can leverage to build project extensions, cross-platform utilities, build-time extensions and support for automation. In this article I’ll walk you through the process of building your own custom DNX command on top of ASP.NET 5.0.

<!-- more -->

## Where You’ve Seen It

DNX has the ability to scan a project.json and look for commands that you install as packages or that you create yourself. If you’ve started following the examples of the MVC Framework or perhaps with Entity Framework, you may have seen things like this in your project.json:

{% codeblock lang:javascript %}
"commands": {
    "web": "Microsoft.AspNet.Hosting --config hosting.ini",
    "ef": "EntityFramework.Commands"
  }
{% endcodeblock %}

[![image](https://jcblogimages.blob.core.windows.net/img/2015/08/image_thumb2.png "image")](https://jcblogimages.blob.core.windows.net/img/2015/08/image5.png)

These entries are here so that DNX understands the alias you assign (such as “web” or “ef”) and how it maps to an assembly that you’ve created or taken on as a dependency. The EF reference is quite straightforward above, simply saying that any call to “ef” via DNX will go into the entry point in EntityFramework.Commands.&nbsp; You would invoke that as follows from the directory of your _project_:

```
dnx . ef 
```

All parameters that are passed in are available to you as well, so if you were to instead use:

```
dnx . ef help migration
```

Then EF would be getting the params “help migrations” to parse and process. As can be clearly seen in the “web” alias, you can also specify defaults that get passed into the command when it is executed, thus, the call to web in the above project.json passes in the path and filename of the configuration file to be used when starting IIS express. 

There is no special meaning to “ef” or “web”. These are just names that you assign so that the correct mapping can be made. If you changed “ef” to “right-said-fred” you would be able to run migrations from the command line like so:

```
dnx . right-said-fred migration add too-sexy
```

Great! So you can create commands, pass in parameters and share these commands through the project.json file. But now what?

## Now What?

I’m so glad you asked!

So far things really aren’t too different from any other console app you might create. I mean, you can parse args and do whatever you like in those apps as well.

But here’s the winner-winner-chicken-dinner bits: did you notice the “.” that is passed into DNX? That is actually the path to the project.json file, and this is important. 

*Important Note*: From beta 7 onward (or already if you’re on the nightly builds) DNX will implicitly run with an appbase of the current directory, removing the need for the “.” in the command. I’ll try to remember to come back to this post to correct that when beta 7 is out in the wild. Read more about the change on the [ASP.NET Announcement repo](https://github.com/aspnet/Announcements/issues/52) on GitHub.

DNX doesn’t actually do a lot on its own, not other than providing an execution context under which you can run your commands. But this is a good thing! By passing in the path to a project.json, you feed DNX the command mappings that you want to use, and in turn, DNX provides you with all of the benefits of running inside of the ASP.NET 5.0 bits. Your console app just got access to Dependency Injection as a first-class citizen in your project, with access to information about whichever app it was that contained that project.json file.&nbsp; 

Consider the EF command mapping again for migrations for a second: what is going on when you tell it to add a migration?&nbsp; It goes something like this:

1.  DNX looks for the project.json at the path you provide
2.  It parses the project.json file and finds the command mapping associated with your statement
3.  I **_creates an instance_** of the class that contains your command, injecting environment and project information as is available
4.  It checks the rest of what you’ve passed in, and invokes the command, passing in any parameters that you’ve supplied

## How to Build Your Own

This is actually super easy!&nbsp; Here’s what you need to do:

1.  Create a new ASP.NET 5 Console Application in Visual Studio 2015
2.  Add any services interfaces you need as parameters to the constructor of the Program class – but this is optional in the “hello dnx” realm of requirements
3.  Add your logic to your Main method – start with something as simple as a Console.WriteLine statement

From there, you can drop to a command line and run your command. That’s it!

*Pro Tip* You can easily get a command line in your project folder by right-clicking on the project in Solution Explorer and selecting “Open Folder in File Explorer”. When File Explorer opens, simply type in “cmd” or “powershell” in the location bar and you’ll get your shell.

The secret as to why it works from the console can be found in your project.json: when you create a console app from the project templates, the command alias mapping for your project is automatically added to your project.&nbsp; In this same way, along with referencing your new command project, _other projects_ can now consume your command.

## Beyond Hello World

It is far more likely that you’re going to need to do something in the context of the project which uses your command. Minimally, you’re likely going to need some configuration drawn in as a default or as a parameter in your command. Let’s look at how you would take that hello world app you created in three steps and do something a little more meaningful with it.

First, let’s add some dependencies to your project.json:

{% codeblock lang:js %}
"dependencies": {
    "Microsoft.Framework.Runtime.Abstractions": "1.0.0-beta6",
    "Microsoft.Framework.Configuration.Abstractions": "1.0.0-beta6",
    "Microsoft.Framework.Configuration.Json": "1.0.0-beta6",
    "Microsoft.Framework.Configuration.UserSecrets": "1.0.0-beta6",
    "Microsoft.Framework.Configuration.CommandLine": "1.0.0-beta6"
  }
{% endcodeblock %}

Now let’s add a new JSON file to our project called config.json with the following contents:

{% codeblock lang:js %}
{
 "command-text": "Say hello to my little DNX"
}
{% endcodeblock %}

Getting there. Next, let’s bulk up the constructor of the Program class, add a private member and a Configuration property:

{% codeblock lang:csharp %}
private readonly IApplicationEnvironment _appEnv;

public Program(IApplicationEnvironment appEnv)
{
    _appEnv = appEnv;
}

public IConfiguration Configuration { get; set; }

{% endcodeblock %}

We also need to add a method to Program that handles loading the config, taking in what it can from the config file, but loading on top of that any arguments passed in from the console:

{% codeblock lang:csharp %}
private void BuildConfiguration(string[] args)
{
    var builder = new ConfigurationBuilder(_appEnv.ApplicationBasePath)
        .AddJsonFile("config.json")
        .AddCommandLine(args);

    Configuration = builder.Build();
}
{% endcodeblock %}

Finally, we’ll add a little more meat to our Main method:

{% codeblock lang:csharp %}
public void Main(string[] args)
{
    BuildConfiguration(args);

    Console.WriteLine(Configuration.Get("command-text"));
    Console.ReadLine();
}
{% endcodeblock %}

The above sample can now be executed as a command. I’ve got the following command mapping in my project.json file (yes, the same project you use to create the command can also expose the command):

{% codeblock lang:js %}
"commands": {
    "DnxCommands": "DnxCommands"
  }
{% endcodeblock %}
This means that from the console in the dir of my project I can just type in the following:

``` 
dnx . DnxCommands
```

I can also now reference this project from any other project (or push my bits to NuGet and share them to any project) and use the command from there. Other projects can add the “command-text” key to their config.json files and specify their own value, or they can feed in the parameter as an arg to the command:

```
dnx . DnxCommands command-text="'Pop!' goes the weasel"
```

In my [sample solution on GitHub](https://github.com/MisterJames/DnxCommands/), I also have a second project which renames the alias and has it’s own config file that is read in by the command.

## Next Steps

All of this opens the doors for some pretty powerful scenarios. Think about what you can do in your build pipeline without having to write, expose and consume custom msbuild targets. You can create commands that are used to build up local databases for new environments or automate the seeding of tables for integration tests. You could add scaffolders and image optimizers and deployment tools and send text messages to your Grandma. 

What you should do next is to look at the kinds of things you do when you’re working on your solution – not in it – and think about how you might be able to simplify those tasks. If there are complex parts of your build scripts that you encounter from one project to the next, perhaps you can abstract some of those bits away into a command and then shift to using simplified build scripts that invoke your commands via DNX.

To get some inspiration, check out my [sample project on GitHub](https://github.com/MisterJames/DnxCommands/), the DNX commands for other libraries (such as [EF](https://github.com/aspnet/EntityFramework/tree/dev/src/EntityFramework.Commands) or [xUnit](https://github.com/xunit/dnx.xunit/)) and try writing a few of your own.

Happy coding! ![Smile](https://jcblogimages.blob.core.windows.net/img/2015/08/wlEmoticon-smile1.png)
