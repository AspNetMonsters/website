title: Supporting Options and Arguments in Your dnx Commands
tags:
  - ASP.NET
  - DNX
  - Visual Studio 2015
id: 7671
categories:
  - Code Dive
date: 2015-09-08 13:00:00
authorId: james_chambers
---

Grab yourself your copy of [<u>Visual Studio 2015</u>](https://www.visualstudio.com/?Wt.mc_id=DX_MVP4038205) and buckle up! Today we’re going to create our own dnx command with support for options and arguments.

<!-- more -->

In my [<u>previous post</u>](http://jameschambers.com/2015/08/writing-custom-commands-for-dnx-with-asp-net-5-0/) on dnx commands I showed how you could create your own command as part of your project that could be invoked via the .Net Execution Environment, a.k.a., dnx. While this works fine in simple scenarios, chances are you might need to have more than one “command” embedded in your tooling. Right away you have concerns for parsing the arguments and options that are passed in, which will quickly lead to a more complex application than you were originally intending.

**Important Note**&nbsp; I am building the samples here in this post on Beta 6, knowing that there are two changes coming in, the first is that they are dropping the project path argument to dnx (the period, or “current directory”), and the second being the high likelihood that there will continue to be refinements in the namespaces of these libraries. I’ll update these when I complete my upgrade to Beta 7.

## A Real-world Example

Consider Entity Framework, where you can access a number of different commands. It provides tooling to your application by making a number of commands related to your project, your entities, your database and your context available from the command line. This is great, because it also means that you can use it in automation tasks.

![image](https://jcblogimages.blob.core.windows.net/img/2015/09/image2.png "image")

Here’s the command as executed from the command line, followed by a call to get the help on a specific command, migration:
<pre class="csharpcode">dnx . ef
dnx . ef migration -h</pre><style type="text/css">.csharpcode, .csharpcode pre
{
	font-size: small;
	color: black;
	font-family: consolas, "Courier New", courier, monospace;
	background-color: #ffffff;
	/*white-space: pre;*/
}
.csharpcode pre { margin: 0em; }
.csharpcode .rem { color: #008000; }
.csharpcode .kwrd { color: #0000ff; }
.csharpcode .str { color: #006080; }
.csharpcode .op { color: #0000c0; }
.csharpcode .preproc { color: #cc6633; }
.csharpcode .asp { background-color: #ffff00; }
.csharpcode .html { color: #800000; }
.csharpcode .attr { color: #ff0000; }
.csharpcode .alt 
{
	background-color: #f4f4f4;
	width: 100%;
	margin: 0em;
}
.csharpcode .lnum { color: #606060; }
</style>

So, think about those switches for a second, and the mistakes and string manipulation you’d need to do to pull that all together. What about supporting help and organizing your commands? Being able to accept different options and arguments can grow to be an exhausting exercise in bloat…

## Unless!

…unless, of course, you had an abstraction over those parsing bits to work with.&nbsp; Quite wonderfully, Microsoft has made available the bits you need to take away those pains, and it all starts with the following package (and a bit of secret sauce):
<pre class="csharpcode">Microsoft.Framework.CommandLineUtils.Sources</pre><style type="text/css">.csharpcode, .csharpcode pre
{
	font-size: small;
	color: black;
	font-family: consolas, "Courier New", courier, monospace;
	background-color: #ffffff;
	/*white-space: pre;*/
}
.csharpcode pre { margin: 0em; }
.csharpcode .rem { color: #008000; }
.csharpcode .kwrd { color: #0000ff; }
.csharpcode .str { color: #006080; }
.csharpcode .op { color: #0000c0; }
.csharpcode .preproc { color: #cc6633; }
.csharpcode .asp { background-color: #ffff00; }
.csharpcode .html { color: #800000; }
.csharpcode .attr { color: #ff0000; }
.csharpcode .alt 
{
	background-color: #f4f4f4;
	width: 100%;
	margin: 0em;
}
.csharpcode .lnum { color: #606060; }
</style>

And here’s the secret sauce…instead of using something like “1.0.0-*” for your version, use this instead: { "version": "1.0.0-*", "type": "build" }. This notation bakes the abstractions into your application so that you don’t have to bundle and distribute multiple DLLs/dependencies when you author and share commands.

The full version of the final, working project in this post is [available on GitHub](https://github.com/MisterJames/DnxCommandsWithOptsArgs/). Feel free to pull down a copy and try this out for yourself!

Let’s get started.

## Creating a Project

As [<u>previously covered</u>](http://jameschambers.com/2015/08/writing-custom-commands-for-dnx-with-asp-net-5-0/), creating an ASP.NET 5 command line app is all that is required to get started with creating your commands. We have to add that package as a dependency as well, which should look like this in it’s entirety in your project.json:
<pre class="csharpcode"><span class="str">"dependencies"</span>: {
  <span class="str">"Microsoft.Framework.CommandLineUtils.Sources"</span>: { <span class="str">"version"</span>: <span class="str">"1.0.0-*"</span>, <span class="str">"type"</span>: <span class="str">"build"</span> }
}</pre><style type="text/css">.csharpcode, .csharpcode pre
{
	font-size: small;
	color: black;
	font-family: consolas, "Courier New", courier, monospace;
	background-color: #ffffff;
	/*white-space: pre;*/
}
.csharpcode pre { margin: 0em; }
.csharpcode .rem { color: #008000; }
.csharpcode .kwrd { color: #0000ff; }
.csharpcode .str { color: #006080; }
.csharpcode .op { color: #0000c0; }
.csharpcode .preproc { color: #cc6633; }
.csharpcode .asp { background-color: #ffff00; }
.csharpcode .html { color: #800000; }
.csharpcode .attr { color: #ff0000; }
.csharpcode .alt 
{
	background-color: #f4f4f4;
	width: 100%;
	margin: 0em;
}
.csharpcode .lnum { color: #606060; }
</style>

Next, we need to make sure that our command is available and named as we’d like it to be called, which is also done in the project.json. Mine looks like this:
<pre class="csharpcode"><span class="str">"commands"</span>: {
  <span class="str">"sample-fu"</span>: <span class="str">"DnxCommandArguments"</span>
},</pre><style type="text/css">.csharpcode, .csharpcode pre
{
	font-size: small;
	color: black;
	font-family: consolas, "Courier New", courier, monospace;
	background-color: #ffffff;
	/*white-space: pre;*/
}
.csharpcode pre { margin: 0em; }
.csharpcode .rem { color: #008000; }
.csharpcode .kwrd { color: #0000ff; }
.csharpcode .str { color: #006080; }
.csharpcode .op { color: #0000c0; }
.csharpcode .preproc { color: #cc6633; }
.csharpcode .asp { background-color: #ffff00; }
.csharpcode .html { color: #800000; }
.csharpcode .attr { color: #ff0000; }
.csharpcode .alt 
{
	background-color: #f4f4f4;
	width: 100%;
	margin: 0em;
}
.csharpcode .lnum { color: #606060; }
</style>

You can imagine, of course, that it will be invoked much like Entity Framework, but with “sample-fu” instead of “ef”. Feel free to name yours as you wish. With that out of the way, we can start to do the heavy lifting in getting our commands exposed to external tooling.

## Working with the CommandLineUtils Objects

Here is a bare-bones application that just displays it’s own help message:
<pre class="csharpcode"><span class="kwrd">public</span> <span class="kwrd">int</span> Main(<span class="kwrd">string</span>[] args)
{
    var app = <span class="kwrd">new</span> CommandLineApplication
    {
        Name = <span class="str">"sample-fu"</span>,
        Description = <span class="str">"Runs different methods as dnx commands"</span>,
        FullName = <span class="str">"Sample-Fu - Your Do-nothing dnx Commandifier"</span>
    };

    <span class="rem">// show the help for the application</span>
    app.OnExecute(() =&gt;
    {
        app.ShowHelp();
        <span class="kwrd">return</span> 2;
    });

    <span class="kwrd">return</span> app.Execute(args);
}</pre><style type="text/css">.csharpcode, .csharpcode pre
{
	font-size: small;
	color: black;
	font-family: consolas, "Courier New", courier, monospace;
	background-color: #ffffff;
	/*white-space: pre;*/
}
.csharpcode pre { margin: 0em; }
.csharpcode .rem { color: #008000; }
.csharpcode .kwrd { color: #0000ff; }
.csharpcode .str { color: #006080; }
.csharpcode .op { color: #0000c0; }
.csharpcode .preproc { color: #cc6633; }
.csharpcode .asp { background-color: #ffff00; }
.csharpcode .html { color: #800000; }
.csharpcode .attr { color: #ff0000; }
.csharpcode .alt 
{
	background-color: #f4f4f4;
	width: 100%;
	margin: 0em;
}
.csharpcode .lnum { color: #606060; }
</style>

You can see that our Main method is basically creating an instance of the CommandLineApplication class, initializing some properties and finally wiring up a Func to be executed at some point in the future.&nbsp; Main returns the result of app.Execute, which in turn handles the processing of anything passed in and itself returns the appropriate value (0 for success, anything else for non-success).&nbsp; Here it is in action (the completed version), simply by typing dnx . sample-fu at the commandline:

![image](https://jcblogimages.blob.core.windows.net/img/2015/09/image3.png "image")

A quick note here as well…the OnExecute() is called if no other command turns out to be appropriate to run, as determined by the internal handling in CommandLineApplication. In effect, we’re saying, “If the user passes nothing in, show the help.” Help is derived from the configuration of commands, so to illustrate that, we need to add one.

## Wiring Up a Command

Now we get into the fun stuff. Let’s write a command that takes a string as an argument and echos it right back out, and add an option to reverse the string.
<pre class="csharpcode">app.Command(<span class="str">"display"</span>, c =&gt;
{
    c.Description = <span class="str">"Displays a message of your choosing to console."</span>;

    var reverseOption = c.Option(<span class="str">"-r|--reverse"</span>, <span class="str">"Display the message in reverse"</span>, CommandOptionType.NoValue);
    var messageArg = c.Argument(<span class="str">"[message]"</span>, <span class="str">"The message you wish to display"</span>);
    c.HelpOption(<span class="str">"-?|-h|--help"</span>);

    c.OnExecute(() =&gt;
    {
        var message = messageArg.Value;
        <span class="kwrd">if</span> (reverseOption.HasValue())
        {
            message = <span class="kwrd">new</span> <span class="kwrd">string</span>(message.ToCharArray().Reverse().ToArray());
        }
        Console.WriteLine(message);
        <span class="kwrd">return</span> 0;
    });
});
</pre>

<style type="text/css">.csharpcode, .csharpcode pre
{
	font-size: small;
	color: black;
	font-family: consolas, "Courier New", courier, monospace;
	background-color: #ffffff;
	/*white-space: pre;*/
}
.csharpcode pre { margin: 0em; }
.csharpcode .rem { color: #008000; }
.csharpcode .kwrd { color: #0000ff; }
.csharpcode .str { color: #006080; }
.csharpcode .op { color: #0000c0; }
.csharpcode .preproc { color: #cc6633; }
.csharpcode .asp { background-color: #ffff00; }
.csharpcode .html { color: #800000; }
.csharpcode .attr { color: #ff0000; }
.csharpcode .alt 
{
	background-color: #f4f4f4;
	width: 100%;
	margin: 0em;
}
.csharpcode .lnum { color: #606060; }
</style>Command takes a name and an action in which we can add our options and arguments and process the input as required.&nbsp; We write a Func for OnExecute here as well, which will be called if the user types the command “display”.&nbsp; The option is implemented as a “NoValue” option type, so the parser is not expecting any value…it’s either on the command line or it isn’t.

The order of args is important, using the pattern:

<font face="Lucida Console">&nbsp;&nbsp;&nbsp; COMMAND OPTIONS ARGUMENTS</font>

You’ll get some errors if you don’t follow that order (and there are some open GitHub issues to help make better parsing and error messages available).

## A More Complicated Example

Next up, let’s implement a command that can do one of two operations based on the option specified, and takes two values for an argument. Here a basic implementation of a calc method, supporting addition and multiplication:
<pre class="csharpcode"><span class="rem">//  the "calc" command</span>
app.Command(<span class="str">"calc"</span>, c =&gt;
{
    c.Description = <span class="str">"Evaluates arguments with the operation specified."</span>;

    var operationOption = c.Option(<span class="str">"-o|--operation &lt;OPERATION&gt;"</span>, <span class="str">"You can add or multiply the terms specified using 'add' or 'mul'."</span>, CommandOptionType.SingleValue);
    var termsArg = c.Argument(<span class="str">"[terms]"</span>, <span class="str">"The numbers to use as a term"</span>, <span class="kwrd">true</span>);
    c.HelpOption(<span class="str">"-?|-h|--help"</span>);

    c.OnExecute(() =&gt;
    {
        <span class="rem">// check to see if we got what we were expecting</span>
        <span class="kwrd">if</span> (!operationOption.HasValue())
        {
            Console.WriteLine(<span class="str">"No operation specified."</span>);
            <span class="kwrd">return</span> 1;
        }
        <span class="kwrd">if</span> (termsArg.Values.Count != 2)
        {
            Console.WriteLine(<span class="str">"You must specify exactly 2 terms."</span>);
            <span class="kwrd">return</span> 1;
        }

        <span class="rem">// perform the operation</span>
        var operation = operationOption.Value();
        var term1 = <span class="kwrd">int</span>.Parse(termsArg.Values[0]);
        var term2 = <span class="kwrd">int</span>.Parse(termsArg.Values[1]);
        <span class="kwrd">if</span> (operation.ToLower() == <span class="str">"mul"</span>)
        {
            var result = term1 * term2;
            Console.WriteLine($<span class="str">" {term1} x {term2} = {result}"</span>);
        }
        <span class="kwrd">else</span>
        {
            var result = term1 + term2;
            Console.WriteLine($<span class="str">" {term1} + {term2} = {result}"</span>);
        }
        <span class="kwrd">return</span> 0;
    });
});</pre><style type="text/css">.csharpcode, .csharpcode pre
{
	font-size: small;
	color: black;
	font-family: consolas, "Courier New", courier, monospace;
	background-color: #ffffff;
	/*white-space: pre;*/
}
.csharpcode pre { margin: 0em; }
.csharpcode .rem { color: #008000; }
.csharpcode .kwrd { color: #0000ff; }
.csharpcode .str { color: #006080; }
.csharpcode .op { color: #0000c0; }
.csharpcode .preproc { color: #cc6633; }
.csharpcode .asp { background-color: #ffff00; }
.csharpcode .html { color: #800000; }
.csharpcode .attr { color: #ff0000; }
.csharpcode .alt 
{
	background-color: #f4f4f4;
	width: 100%;
	margin: 0em;
}
.csharpcode .lnum { color: #606060; }
</style>

Of note are the differences between the options and the arguments versus the first command. The option accepts one of two values, and the argument can accept exactly two values. We have to do a bit of validation on our own here, but these are the basic mechanics of getting commands working.

Taking it to the next level, you may wish to encapsulate your code in a class, or leverage the fact that DNX (and thus, your commands) are aware of the project context that you are running in…remember that if you are running in a project directory, you have the ability to read from the project.json.

## Next Steps

Be sure to grab [<u>Visual Studio 2015</u>](https://www.visualstudio.com/?Wt.mc_id=DX_MVP4038205) and then start experimenting with commands. You can have a look at some of the other repos/projects that leverage CommandLineUtils, or check out the <u>[completed project from this post on GitHub](https://github.com/MisterJames/DnxCommandsWithOptsArgs/)</u>.

Happy Coding! ![Smile](https://jcblogimages.blob.core.windows.net/img/2015/09/wlEmoticon-smile1.png)
