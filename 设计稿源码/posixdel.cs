using System;
using System.Runtime.InteropServices;

class PosixDel
{
    const uint DELETE = 0x00010000;
    const uint FILE_SHARE_ALL = 0x00000007;
    const uint OPEN_EXISTING = 3;
    const uint FILE_ATTRIBUTE_NORMAL = 0x80;
    const int FileDispositionInfoEx = 21;
    const uint DISPOSITION_DELETE = 0x00000001;
    const uint DISPOSITION_POSIX = 0x00000002;
    const uint DISPOSITION_IGNORE_READONLY = 0x00000010;

    [StructLayout(LayoutKind.Sequential)]
    struct FILE_DISPOSITION_INFO_EX { public uint Flags; }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr CreateFile(string name, uint access, uint share, IntPtr sec,
        uint disposition, uint flags, IntPtr templ);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetFileInformationByHandle(IntPtr h, int cls, ref FILE_DISPOSITION_INFO_EX info, int size);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr h);

    static int Main(string[] args)
    {
        if (args.Length != 1) { Console.Error.WriteLine("usage: posixdel <file>"); return 2; }
        IntPtr h = CreateFile(args[0], DELETE, FILE_SHARE_ALL, IntPtr.Zero, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, IntPtr.Zero);
        if (h == new IntPtr(-1))
        {
            Console.Error.WriteLine("CreateFile failed: " + Marshal.GetLastWin32Error());
            return 3;
        }
        var info = new FILE_DISPOSITION_INFO_EX();
        info.Flags = DISPOSITION_DELETE | DISPOSITION_POSIX | DISPOSITION_IGNORE_READONLY;
        bool ok = SetFileInformationByHandle(h, FileDispositionInfoEx, ref info, Marshal.SizeOf(info));
        int err = Marshal.GetLastWin32Error();
        CloseHandle(h);
        if (!ok) { Console.Error.WriteLine("SetFileInformation failed: " + err); return 4; }
        Console.WriteLine("deleted");
        return 0;
    }
}
