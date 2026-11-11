import AppKit
let a = CommandLine.arguments; let imgs = a[2...].map { NSImage(contentsOfFile: $0)! }
let w = imgs[0].size.width/2, h = imgs[0].size.height/2
let out = NSImage(size: NSSize(width: w*CGFloat(imgs.count), height: h)); out.lockFocus()
for (i, im) in imgs.enumerated() { im.draw(in: NSRect(x: w*CGFloat(i), y: 0, width: w, height: h)) }
out.unlockFocus(); let r = NSBitmapImageRep(data: out.tiffRepresentation!)!
try! r.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[1]))
