<script lang="ts">
  import {
    animationFrameScheduler,
    combineLatest,
    debounceTime,
    filter,
    map,
    mergeMap,
    of,
    ReplaySubject,
    share,
    shareReplay,
    startWith,
    Subject,
    tap
  } from 'rxjs';
  import BookReaderContinuous from '$lib/components/book-reader/book-reader-continuous/book-reader-continuous.svelte';
  import { pxReader } from '$lib/components/book-reader/css-classes';
  import type { BooksDbBookmarkData } from '$lib/data/database/books-db/versions/books-db';
  import type { FuriganaStyle } from '$lib/data/furigana-style';
  import { ViewMode } from '$lib/data/view-mode';
  import { iffBrowser } from '$lib/functions/rxjs/iff-browser';
  import { reduceToEmptyString } from '$lib/functions/rxjs/reduce-to-empty-string';
  import { writableSubject } from '$lib/functions/svelte/store';
  import { convertRemToPixels } from '$lib/functions/utils';
  import { logger } from '$lib/data/logger';
  import { imageLoadingState } from './image-loading-state';
  import { reactiveElements } from './reactive-elements';
  import type { AutoScroller, BookmarkManager, PageManager } from './types';
  import BookReaderPaginated from './book-reader-paginated/book-reader-paginated.svelte';
  import { enableReaderWakeLock$, enableTapEdgeToFlip$ } from '$lib/data/store';
  import { onDestroy } from 'svelte';

  import { onMount } from 'svelte';

onMount(() => {
  const sub = containerEl$.subscribe(el => {
    if (!el) return;

    const tapListener = (e: PointerEvent) => handleTap(e);
    el.addEventListener("pointerup", tapListener);

    return () => el.removeEventListener("pointerup", tapListener);
  });

  return () => sub.unsubscribe();
});

  let selectedText = '';
  let popupX = 0;
  let popupY = 0;
  let isPopupVisible = false;
  let side: 'left' | 'right' = 'right';

function getWordRangeFromPoint(x: number, y: number): Range | null {
  let range: Range | null = null;

  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if ((document as any).caretPositionFromPoint) {
    const pos = (document as any).caretPositionFromPoint(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse();
    }
  }

  if (!range) return null;

  const node = range.startContainer;

  if (node.nodeType !== Node.TEXT_NODE) return null;

  const text = node.textContent ?? "";
  let start = range.startOffset;
  let end = range.startOffset;

  while (start > 0 && /\p{Letter}|\p{Number}/u.test(text[start - 1])) start--;
  while (end < text.length && /\p{Letter}|\p{Number}/u.test(text[end])) end++;

  if (start === end) return null;

  const wordRange = document.createRange();
  wordRange.setStart(node, start);
  wordRange.setEnd(node, end);

  return wordRange;
}

function getWordAtPoint(el: HTMLElement, x: number, y: number): string | null {
  const range = document.caretRangeFromPoint
    ? document.caretRangeFromPoint(x, y)
    : (document as any).caretPositionFromPoint
    ? (() => {
        const pos = (document as any).caretPositionFromPoint(x, y);
        if (!pos) return null;
        const r = document.createRange();
        r.setStart(pos.offsetNode, pos.offset);
        r.collapse();
        return r;
      })()
    : null;

  if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;

  const text = range.startContainer.textContent ?? "";
  let start = range.startOffset;
  let end = range.startOffset;

  while (start > 0 && /\p{Letter}|\p{Number}/u.test(text[start - 1])) start--;
  while (end < text.length && /\p{Letter}|\p{Number}/u.test(text[end])) end++;

  return text.slice(start, end) || null;
}

function handleTap(event: PointerEvent) {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const { clientX, clientY } = event;

  const text = getWordAtPoint(event.target as HTMLElement, clientX, clientY);

  if (!text) {
    isPopupVisible = false;
    return;
  }

  selectedText = text;

  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  side = centerX > viewportWidth / 2 ? 'left' : 'right';

  const horizontalOffset = 14;

  popupX = side === 'right'
    ? rect.right + horizontalOffset
    : rect.left - horizontalOffset;

  popupY = centerY;

  const popupHeight = 260;

  if (popupY + popupHeight > viewportHeight - 16) {
    popupY = viewportHeight - popupHeight - 16;
  }

  if (popupY < 16) {
    popupY = 16;
  }

  isPopupVisible = true;
}

function selectWord(x: number, y: number) {
  const range = getWordRangeFromPoint(x, y);
  if (!range) {
    isPopupVisible = false;
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;

  selection.removeAllRanges();
  selection.addRange(range);

  const text = range.toString().trim();

  if (!text || text.length > 50) {
    isPopupVisible = false;
    return;
  }

  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  selectedText = text;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  side = centerX > viewportWidth / 2 ? 'left' : 'right';

  const horizontalOffset = 14;

  popupX = side === 'right'
    ? rect.right + horizontalOffset
    : rect.left - horizontalOffset;

  popupY = centerY;

  const popupHeight = 260;

  if (popupY + popupHeight > viewportHeight - 16) {
    popupY = viewportHeight - popupHeight - 16;
  }

  if (popupY < 16) {
    popupY = 16;
  }

  isPopupVisible = true;
}
  export let htmlContent: string;

  export let width: number;

  export let height: number;

  export let verticalMode: boolean;

  export let fontFeatureSettings: string;

  export let verticalTextOrientation: string;

  export let prioritizeReaderStyles: boolean;

  export let enableTextJustification: boolean;

  export let enableTextWrapPretty: boolean;

  export let textIndentation: number;

  export let textMarginValue: number;

  export let fontColor: string;

  export let backgroundColor: string;

  export let hintFuriganaFontColor: string;

  export let hintFuriganaShadowColor: string;

  export let fontFamilyGroupOne: string;

  export let fontFamilyGroupTwo: string;

  export let fontSize: number;

  export let lineHeight: number;

  export let hideSpoilerImage: boolean;

  export let hideFurigana: boolean;

  export let furiganaStyle: FuriganaStyle;

  export let secondDimensionMaxValue: number;

  export let firstDimensionMargin: number;

  export let autoPositionOnResize: boolean;

  export let avoidPageBreak: boolean;

  export let pageColumns: number;

  export let autoBookmark: boolean;

  export let autoBookmarkTime: number;

  export let viewMode: ViewMode;

  export let exploredCharCount: number;

  export let bookCharCount: number;

  export let multiplier: number;

  export let bookmarkData: Promise<BooksDbBookmarkData | undefined>;

  export let autoScroller: AutoScroller | undefined;

  export let bookmarkManager: BookmarkManager | undefined;

  export let pageManager: PageManager | undefined;

  export let isBookmarkScreen: boolean;

  export let customReadingPoint: number;

  export let customReadingPointTop: number;

  export let customReadingPointLeft: number;

  export let customReadingPointScrollOffset: number;

  export let customReadingPointRange: Range | undefined;

  export let showCustomReadingPoint: boolean;

  let showBlurMessage = false;

  let wakeLock: WakeLockSentinel | undefined;

  let visibilityState: DocumentVisibilityState;

  const mutationObserver: MutationObserver = new MutationObserver(handleMutation);

  const width$ = new Subject<number>();

  const height$ = new Subject<number>();

  const containerEl$ = writableSubject<HTMLElement | null>(null);

  $: heightModifer =
    firstDimensionMargin && ViewMode.Paginated === viewMode && !verticalMode
      ? firstDimensionMargin * 2
      : 0;

  $: if ($enableReaderWakeLock$ && visibilityState === 'visible') {
    setTimeout(requestWakeLock, 500);
  }

  onDestroy(() => {
    mutationObserver.disconnect();

    releaseWakeLock();
  });

  const computedStyle$ = combineLatest([
    containerEl$.pipe(filter((el): el is HTMLElement => !!el)),
    combineLatest([width$, height$]).pipe(startWith(0))
  ]).pipe(
    debounceTime(0, animationFrameScheduler),
    map(([el]) => getComputedStyle(el)),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  const contentEl$ = new ReplaySubject<HTMLElement>(1);

  const contentViewportWidth$ = computedStyle$.pipe(
    map((style) =>
      getAdjustedWidth(
        width -
          parsePx(style.paddingLeft) -
          parsePx(style.paddingRight) -
          ($enableTapEdgeToFlip$ && ViewMode.Paginated === viewMode && !verticalMode
            ? convertRemToPixels(window, 1.75)
            : 0)
      )
    )
  );

  const contentViewportHeight$ = computedStyle$.pipe(
    map((style) =>
      getAdjustedHeight(
        height - parsePx(style.paddingTop) - parsePx(style.paddingBottom) - heightModifer
      )
    )
  );

  const reactiveElements$ = iffBrowser(() => of(document)).pipe(
    mergeMap((document) => {
      const reactiveElementsFn = reactiveElements(
        document,
        furiganaStyle,
        hideSpoilerImage,
        navigator.standalone || window.matchMedia('(display-mode: fullscreen)').matches
      );
      return contentEl$.pipe(mergeMap((contentEl) => reactiveElementsFn(contentEl)));
    }),
    reduceToEmptyString()
  );

  const imageLoadingState$ = contentEl$.pipe(
    mergeMap((contentEl) => imageLoadingState(contentEl)),
    share()
  );

  const blurListener$ = contentEl$.pipe(
    tap((contentEl) => {
      mutationObserver.disconnect();
      mutationObserver.observe(contentEl, { attributes: true });
    }),
    reduceToEmptyString()
  );

  $: width$.next(width);

  $: height$.next(height);

  function getAdjustedWidth(widthValue: number) {
    if (ViewMode.Paginated === viewMode && !verticalMode && secondDimensionMaxValue) {
      return Math.min(secondDimensionMaxValue, widthValue);
    }
    return widthValue;
  }

  function getAdjustedHeight(heightValue: number) {
    if (ViewMode.Paginated === viewMode && verticalMode && secondDimensionMaxValue) {
      return Math.min(secondDimensionMaxValue, heightValue);
    }
    return heightValue;
  }

  function parsePx(px: string) {
    return Number(px.replace(/px$/, ''));
  }

  function handleMutation([mutation]: MutationRecord[]) {
    if (!(mutation.target instanceof HTMLElement)) {
      showBlurMessage = false;
      return;
    }

    showBlurMessage = mutation.target.style.filter.includes('blur');
  }

  async function requestWakeLock() {
    if (wakeLock && !wakeLock.released) {
      return;
    }

    wakeLock = await navigator.wakeLock.request().catch(({ message }) => {
      logger.error(`failed to request wakelock: ${message}`);

      return undefined;
    });

    if (wakeLock) {
      wakeLock.addEventListener('release', releaseWakeLock, false);
    }
  }

  async function releaseWakeLock() {
    if (wakeLock && !wakeLock.released) {
      await wakeLock.release().catch(() => {
        // no-op
      });
    }

    wakeLock = undefined;
  }
</script>

{#if showBlurMessage}
  <div
    class="fixed top-12 right-4 p-2 border max-w-[90vw] z-[1]"
    style:writing-mode="horizontal-tb"
    style:color={fontColor}
    style:background-color={backgroundColor}
    style:border-color={fontColor}
  >
    The reader is currently blurred due to an external application (e. g. exstatic)
  </div>
{/if}
<div bind:this={$containerEl$} class="{pxReader} py-8">
  {#if viewMode === ViewMode.Continuous}
    <BookReaderContinuous
      {htmlContent}
      width={$contentViewportWidth$ ?? 0}
      height={$contentViewportHeight$ ?? 0}
      {verticalMode}
      {fontFeatureSettings}
      {verticalTextOrientation}
      {prioritizeReaderStyles}
      {enableTextJustification}
      {enableTextWrapPretty}
      {fontColor}
      {backgroundColor}
      {hintFuriganaFontColor}
      {hintFuriganaShadowColor}
      {fontFamilyGroupOne}
      {fontFamilyGroupTwo}
      {fontSize}
      {lineHeight}
      {textIndentation}
      {textMarginValue}
      {hideSpoilerImage}
      {hideFurigana}
      {furiganaStyle}
      {secondDimensionMaxValue}
      {firstDimensionMargin}
      {autoPositionOnResize}
      {autoBookmark}
      {autoBookmarkTime}
      {multiplier}
      loadingState={$imageLoadingState$ ?? true}
      bind:exploredCharCount
      bind:bookCharCount
      bind:bookmarkData
      bind:autoScroller
      bind:bookmarkManager
      bind:pageManager
      bind:customReadingPoint
      bind:customReadingPointTop
      bind:customReadingPointLeft
      bind:customReadingPointScrollOffset
      on:contentChange={(ev) => contentEl$.next(ev.detail)}
      on:bookmark
      on:trackerPause
    />
  {:else}
    <BookReaderPaginated
      {htmlContent}
      width={$contentViewportWidth$ ?? 0}
      height={$contentViewportHeight$ ?? 0}
      {verticalMode}
      {fontFeatureSettings}
      {verticalTextOrientation}
      {prioritizeReaderStyles}
      {enableTextJustification}
      {enableTextWrapPretty}
      {fontColor}
      {backgroundColor}
      {hintFuriganaFontColor}
      {hintFuriganaShadowColor}
      {fontFamilyGroupOne}
      {fontFamilyGroupTwo}
      {fontSize}
      {lineHeight}
      {textIndentation}
      {textMarginValue}
      {hideSpoilerImage}
      {hideFurigana}
      {furiganaStyle}
      loadingState={$imageLoadingState$ ?? true}
      {avoidPageBreak}
      {pageColumns}
      {autoBookmark}
      {autoBookmarkTime}
      {firstDimensionMargin}
      bind:exploredCharCount
      bind:bookCharCount
      bind:isBookmarkScreen
      bind:bookmarkData
      bind:bookmarkManager
      bind:pageManager
      bind:customReadingPointRange
      bind:showCustomReadingPoint
      on:contentChange={(ev) => contentEl$.next(ev.detail)}
      on:bookmark
      on:trackerPause
    />
  {/if}
</div>

{#if isPopupVisible}
  <div 
    class="fixed z-[9999] pointer-events-none transition-all duration-150"
    style:left="{popupX}px"
    style:top="{popupY}px"
  >
    <div 
      class="absolute p-4 rounded-xl shadow-2xl border bg-white text-black w-[280px] sm:w-[350px] pointer-events-auto"
      class:anchor-left={side === 'left'}
      class:anchor-right={side === 'right'}
      style:writing-mode="horizontal-tb"
      style:max-height="80vh"
      style:overflow-y="auto"
    >
      <div class="flex justify-between items-start mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider opacity-40">Dictionary Lookup</span>
        <button on:click={() => isPopupVisible = false} class="text-gray-400 hover:text-black">✕</button>
      </div>

      <div class="text-2xl font-bold mb-2">{selectedText}</div>
      
      <div class="space-y-3 pt-3 border-t border-gray-100">
        <div class="animate-pulse flex space-x-4">
          <div class="flex-1 space-y-2 py-1">
            <div class="h-2 bg-gray-200 rounded w-3/4"></div>
            <div class="h-2 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* If the popup is to the left of the word, it must translate itself 100% left */
  .anchor-left {
    right: 0;
    transform: translateX(0); /* Anchored to the right of this container */
    margin-right: 0;
    left: auto;
    /* transform: translateX(-100%); */
  }

  /* If the popup is to the right of the word, it stays at 0 */
  .anchor-right {
    left: 0;
    transform: translateX(0);
  }

  /* Prevent the popup from flying off the bottom of the screen */
  div.absolute {
    /* If the word is at the bottom, this ensures the popup expands upwards */
    bottom: auto; 
    top: 0;
  }
</style>
{$blurListener$ ?? ''}
{$reactiveElements$ ?? ''}