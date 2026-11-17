using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

namespace LifeAtlas {
    [ComImport, Guid("00021401-0000-0000-C000-000000000046")] internal class ShellLink {}
    [ComImport, Guid("000214F9-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IShellLinkW {
        void GetPath(StringBuilder path, int length, IntPtr data, uint flags);
        void GetIDList(out IntPtr list);
        void SetIDList(IntPtr list);
        void GetDescription(StringBuilder description, int length);
        void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string description);
        void GetWorkingDirectory(StringBuilder directory, int length);
        void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string directory);
        void GetArguments(StringBuilder arguments, int length);
        void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string arguments);
        void GetHotkey(out short hotkey);
        void SetHotkey(short hotkey);
        void GetShowCmd(out int command);
        void SetShowCmd(int command);
        void GetIconLocation(StringBuilder path, int length, out int index);
        void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string path, int index);
        void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string path, uint reserved);
        void Resolve(IntPtr hwnd, uint flags);
        void SetPath([MarshalAs(UnmanagedType.LPWStr)] string path);
    }
    [StructLayout(LayoutKind.Sequential)] internal struct PropertyKey {
        public Guid Format;
        public uint Id;
    }
    [StructLayout(LayoutKind.Explicit, Size=24)] internal struct PropVariant {
        [FieldOffset(0)] public ushort Type;
        [FieldOffset(8)] public IntPtr Value;
    }
    [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IPropertyStore {
        void GetCount(out uint count);
        void GetAt(uint index, out PropertyKey key);
        void GetValue(ref PropertyKey key, out PropVariant value);
        void SetValue(ref PropertyKey key, ref PropVariant value);
        void Commit();
    }
    public static class Shortcut {
        public static void Create(string path, string executable, string arguments, string icon, string appId) {
            object link = new ShellLink();
            var value = new PropVariant { Type=31, Value=Marshal.StringToCoTaskMemUni(appId) };
            try {
                var shell = (IShellLinkW)link;
                shell.SetPath(executable);
                shell.SetArguments(arguments);
                shell.SetDescription("Life Atlas journal reminders");
                shell.SetIconLocation(icon,0);
                shell.SetShowCmd(7);
                var key = new PropertyKey { Format=new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), Id=5 };
                var store=(IPropertyStore)link;
                store.SetValue(ref key,ref value);
                store.Commit();
                ((IPersistFile)link).Save(path,true);
            } finally {
                Marshal.FreeCoTaskMem(value.Value);
                Marshal.FinalReleaseComObject(link);
            }
        }
    }
}
