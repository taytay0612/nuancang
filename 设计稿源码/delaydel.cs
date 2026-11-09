using System;
using System.Runtime.InteropServices;

class DelayDel
{
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool MoveFileEx(string existing, string newName, uint flags);

    static int Main(string[] args)
    {
        if (args.Length != 1) { Console.Error.WriteLine("usage: delaydel <file>"); return 2; }
        bool ok = MoveFileEx(args[0], null, 4); // MOVEFILE_DELAY_UNTIL_REBOOT
        if (!ok) { Console.Error.WriteLine("MoveFileEx failed: " + Marshal.GetLastWin32Error()); return 3; }
        Console.WriteLine("scheduled");
        return 0;
    }
}
