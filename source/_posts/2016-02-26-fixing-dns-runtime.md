title: Fixing "Dnx Runtime package needs to be installed" error
id: 6001
categories:
  - Development
tags:
  - ASP.NET Core
date: 2016-02-26 9:45:00
authorId: simon_timms
---

I went to build an older project on which I hadn't worked for a while and I found that running msbuild on the solution file like so 

{% codeblock lang:powershell %}
& "C:\Program Files (x86)\MSBuild\14.0\Bin\MSBuild.exe" .\GenFu.sln
{% endcodeblock %}

resulted in an error which looked like 

{% codeblock lang:powershell %}
GetRuntimeToolingPathTarget:
  Cannot find DNX runtime dnx-clr-win-x86.1.0.0-rc1-final in the folder: C:\Users\stimms\.dnx\runtimes
C:\Program Files (x86)\MSBuild\Microsoft\VisualStudio\v14.0\DNX\Microsoft.DNX.targets(126,5): error : The Dnx Runtime package needs  to be installed. See output window for more details. [C:\code\GenFu\src\GenFu\GenFu.xproj]
{% endcodeblock %}

<!-- more -->

As it turns out the key is that this project is using `dnx-clr-win-x86.1.0.0-rc1-final` and my machine doesn't have that installed. You can test out which version is installed by running `dnvm list`

{% codeblock lang:powershell %}
>dnvm list

Active Version           Runtime Architecture OperatingSystem Alias
------ -------           ------- ------------ --------------- -----
       1.0.0-rc1-update1 clr     x64          win
       1.0.0-rc1-update1 clr     x86          win
  *    1.0.0-rc1-update1 coreclr x64          win             default
       1.0.0-rc1-update1 coreclr x86          win
{% endcodeblock %}

I fixed the problem by updating the global.json to point at the newer runtime

{% codeblock lang:json %}
{
  "projects": [ "src", "test" ],
  "sdk": {
    "version": "1.0.0-rc1-final",
    "runtime": "coreclr"
  }
}
{% endcodeblock %}

And all was good. 