import PDFKit; import AppKit
let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!
for i in 0..<doc.pageCount { let p = doc.page(at: i)!; let b = p.bounds(for: .mediaBox)
  let img = p.thumbnail(of: NSSize(width: b.width*1.5, height: b.height*1.5), for: .mediaBox)
  let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(a[2])-p\(i+1).png")) }
