import * as React from 'react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export const scaleValue = (value, from, to) => {
  const scale = (to[1] - to[0]) / (from[1] - from[0])
  const capped = Math.min(from[1], Math.max(from[0], value)) - from[0]
  return Math.floor(capped * scale + to[0])
}

export function DockIcon({
  className,
  src,
  href = '#',
  name,
  handleIconHover,
  children,
  iconSize,
  onClick,
  disabled = false,
}) {
  const ref = useRef(null)

  const content = (
    <>
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-[inherit]" />
      ) : (
        children
      )}
    </>
  )

  return (
    <li
      ref={ref}
      style={{
        transition: 'width, height, margin-top cubic-bezier(0.25, 1, 0.5, 1) 150ms',
        '--icon-size': `${iconSize}px`,
      }}
      onMouseMove={handleIconHover}
      className={cn(
        'dock-icon group/li flex h-[var(--icon-size)] w-[var(--icon-size)] items-center justify-center px-[calc(var(--icon-size)*0.075)] [&_img]:object-contain',
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:-mt-[calc(var(--icon-size)/2)] hover:h-[calc(var(--icon-size)*1.5)] hover:w-[calc(var(--icon-size)*1.5)]',
        className
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="group/a relative aspect-square w-full rounded-[10px] border border-gray-100 bg-gradient-to-t from-neutral-100 to-white p-1.5 shadow-[rgba(0,_0,_0,_0.05)_0px_1px_0px_inset] after:absolute after:inset-0 after:rounded-[inherit] after:shadow-md after:shadow-zinc-800/10 disabled:pointer-events-none dark:border-zinc-900 dark:from-zinc-900 dark:to-zinc-800 dark:shadow-[rgba(255,_255,_255,_0.3)_0px_1px_0px_inset]"
          aria-label={name}
          title={name}
        >
          <span className="pointer-events-none absolute top-[-40px] left-1/2 -translate-x-1/2 rounded-md border border-gray-100 bg-gradient-to-t from-neutral-100 to-white p-1 px-2 text-xs whitespace-nowrap text-black opacity-0 transition-opacity duration-200 group-hover/li:opacity-100 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800 dark:text-white">
            {name}
          </span>
          {content}
        </button>
      ) : (
        <a
          href={href}
          className="group/a relative aspect-square w-full rounded-[10px] border border-gray-100 bg-gradient-to-t from-neutral-100 to-white p-1.5 shadow-[rgba(0,_0,_0,_0.05)_0px_1px_0px_inset] after:absolute after:inset-0 after:rounded-[inherit] after:shadow-md after:shadow-zinc-800/10 dark:border-zinc-900 dark:from-zinc-900 dark:to-zinc-800 dark:shadow-[rgba(255,_255,_255,_0.3)_0px_1px_0px_inset]"
        >
          <span className="pointer-events-none absolute top-[-40px] left-1/2 -translate-x-1/2 rounded-md border border-gray-100 bg-gradient-to-t from-neutral-100 to-white p-1 px-2 text-xs whitespace-nowrap text-black opacity-0 transition-opacity duration-200 group-hover/li:opacity-100 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800 dark:text-white">
            {name}
          </span>
          {content}
        </a>
      )}
    </li>
  )
}

export function Dock({
  className,
  children,
  maxAdditionalSize = 5,
  iconSize = 55,
}) {
  const dockRef = useRef(null)

  const handleIconHover = (e) => {
    if (!dockRef.current) return
    const mousePos = e.clientX
    const iconPosLeft = e.currentTarget.getBoundingClientRect().left
    const iconWidth = e.currentTarget.getBoundingClientRect().width

    const cursorDistance = (mousePos - iconPosLeft) / iconWidth
    const offsetPixels = scaleValue(
      cursorDistance,
      [0, 1],
      [maxAdditionalSize * -1, maxAdditionalSize]
    )

    dockRef.current.style.setProperty('--dock-offset-left', `${offsetPixels * -1}px`)
    dockRef.current.style.setProperty('--dock-offset-right', `${offsetPixels}px`)
  }

  return (
    <nav ref={dockRef} role="navigation" aria-label="Main Dock" className="dock-root">
      <style>
        {`
          .dock-root .dock-icon:hover + .dock-icon {
            width: calc(var(--icon-size) * 1.33 + var(--dock-offset-right, 0px));
            height: calc(var(--icon-size) * 1.33 + var(--dock-offset-right, 0px));
            margin-top: calc(var(--icon-size) * -0.33 + var(--dock-offset-right, 0) * -1);
          }

          .dock-root .dock-icon:hover + .dock-icon + .dock-icon {
            width: calc(var(--icon-size) * 1.17 + var(--dock-offset-right, 0px));
            height: calc(var(--icon-size) * 1.17 + var(--dock-offset-right, 0px));
            margin-top: calc(var(--icon-size) * -0.17 + var(--dock-offset-right, 0) * -1);
          }

          .dock-root .dock-icon:has(+ .dock-icon:hover) {
            width: calc(var(--icon-size) * 1.33 + var(--dock-offset-left, 0px));
            height: calc(var(--icon-size) * 1.33 + var(--dock-offset-left, 0px));
            margin-top: calc(var(--icon-size) * -0.33 + var(--dock-offset-left, 0) * -1);
          }

          .dock-root .dock-icon:has(+ .dock-icon + .dock-icon:hover) {
            width: calc(var(--icon-size) * 1.17 + var(--dock-offset-left, 0px));
            height: calc(var(--icon-size) * 1.17 + var(--dock-offset-left, 0px));
            margin-top: calc(var(--icon-size) * -0.17 + var(--dock-offset-left, 0) * -1);
          }
        `}
      </style>
      <ul
        className={cn(
          'flex items-center rounded-xl border border-gray-100 bg-gradient-to-t from-neutral-50 to-white p-1 dark:border-zinc-900 dark:from-zinc-950 dark:to-zinc-900',
          className
        )}
      >
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child, {
                handleIconHover,
                iconSize,
              })
            : child
        )}
      </ul>
    </nav>
  )
}
