import { Dock, DockIcon } from '@/components/ui/dock'
import {
  Brush,
  Eraser,
  ImagePlus,
  Shapes,
  Undo2,
  Redo2,
  Download,
} from 'lucide-react'

export default function DockDemo() {
  const dockItems = [
    {
      src: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=128&q=80',
      name: 'Creative Workspace',
      href: '#creative-workspace',
    },
    {
      src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=128&q=80',
      name: 'Code Desk',
      href: '#code-desk',
    },
    {
      src: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=128&q=80',
      name: 'Team Board',
      href: '#team-board',
    },
  ]

  return (
    <div className="space-y-3">
      <Dock>
        <DockIcon name="Undo" onClick={() => {}}>
          <Undo2 className="h-full w-full p-2 text-gray-700" />
        </DockIcon>
        <DockIcon name="Redo" onClick={() => {}}>
          <Redo2 className="h-full w-full p-2 text-gray-700" />
        </DockIcon>
        <DockIcon name="Brush" onClick={() => {}}>
          <Brush className="h-full w-full p-2 text-gray-700" />
        </DockIcon>
        <DockIcon name="Eraser" onClick={() => {}}>
          <Eraser className="h-full w-full p-2 text-gray-700" />
        </DockIcon>
        <DockIcon name="Shapes" onClick={() => {}}>
          <Shapes className="h-full w-full p-2 text-gray-700" />
        </DockIcon>
        <DockIcon name="Image" onClick={() => {}}>
          <ImagePlus className="h-full w-full p-2 text-gray-700" />
        </DockIcon>
        <DockIcon name="Export" onClick={() => {}}>
          <Download className="h-full w-full p-2 text-gray-700" />
        </DockIcon>
      </Dock>

      <Dock>
        {dockItems.map((item) => (
          <DockIcon
            key={item.name}
            src={item.src}
            name={item.name}
            href={item.href}
          />
        ))}
      </Dock>
    </div>
  )
}
