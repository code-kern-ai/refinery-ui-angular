
type ScrollHelper = {
    elementId?: string // if elementId is not provided, then the window is used
    onReachingBottom?: () => void
    onReachingTop?: () => void
    onLeavingBottom?: () => void
    onLeavingTop?: () => void
    onScroll?: () => void
}

class ScrollLookup {
    public static active: { [elementId: string]: ScrollHelper } = {};
    public static lookup: {
        [elementId: string]: {
            scrollFunction?: () => void
            isTop: boolean
            isBottom: boolean
        }
    } = {};
}


export function addScroll(scrollInfo: ScrollHelper, timeout?: number) {
    //overwrites if same id is given
    if (!scrollInfo) return;
    if (timeout) {
        setTimeout(() => addScroll(scrollInfo), timeout);
        return;
    }

    const lookupKey = scrollInfo.elementId || "@@window@@";
    const newElement = !(lookupKey in ScrollLookup.active);

    ScrollLookup.active[lookupKey] = {};
    ScrollLookup.lookup[lookupKey] = { isBottom: false, isTop: true };
    if (scrollInfo.onReachingBottom) ScrollLookup.active[lookupKey].onReachingBottom = scrollInfo.onReachingBottom;
    if (scrollInfo.onReachingTop) ScrollLookup.active[lookupKey].onReachingTop = scrollInfo.onReachingTop;
    if (scrollInfo.onLeavingBottom) ScrollLookup.active[lookupKey].onLeavingBottom = scrollInfo.onLeavingBottom;
    if (scrollInfo.onLeavingTop) ScrollLookup.active[lookupKey].onLeavingTop = scrollInfo.onLeavingTop;
    if (scrollInfo.onScroll) ScrollLookup.active[lookupKey].onScroll = scrollInfo.onScroll;

    if (Object.keys(ScrollLookup.active[lookupKey]).length === 0) {
        delete ScrollLookup.active[lookupKey];
        delete ScrollLookup.lookup[lookupKey];
        return;
    }

    if (!newElement) return;

    const [listenerTarget, element] = getScrollElementAndTarget(scrollInfo.elementId);

    const scrollFunction = () => {
        const active = ScrollLookup.active[lookupKey];

        if (Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 1) {
            ScrollLookup.lookup[lookupKey].isBottom = true;
            if (active.onReachingBottom) active.onReachingBottom();
        } else if (ScrollLookup.lookup[lookupKey].isBottom) {
            ScrollLookup.lookup[lookupKey].isBottom = false;
            if (active.onLeavingBottom) active.onLeavingBottom();
        }
        if (element.scrollTop < 1) {
            ScrollLookup.lookup[lookupKey].isTop = true;
            if (active.onReachingTop) active.onReachingTop();
        } else if (ScrollLookup.lookup[lookupKey].isTop) {
            ScrollLookup.lookup[lookupKey].isTop = false;
            if (active.onLeavingTop) active.onLeavingTop();
        }
        if (active.onScroll) active.onScroll();
    }
    ScrollLookup.lookup[lookupKey].scrollFunction = scrollFunction;

    listenerTarget.addEventListener("scroll", scrollFunction, false);
}

function getScrollElementAndTarget(elementId?: string): [HTMLElement | Window, HTMLElement] {
    if (!elementId) return [window, document.documentElement];
    const element = document.getElementById(elementId);
    return [element, element];
}

export function removeScroll(elementId?: string) {
    const lookupKey = elementId || "@@window@@";
    if (!(lookupKey in ScrollLookup.active)) return;
    const [listenerTarget, element] = getScrollElementAndTarget(elementId);
    if (listenerTarget) listenerTarget.removeEventListener("scroll", ScrollLookup.lookup[lookupKey].scrollFunction, false);
    delete ScrollLookup.active[lookupKey];
    delete ScrollLookup.lookup[lookupKey];

}

export function scrollElementIntoView(elementId: string, timeout?: number) {
    if (timeout) {
        setTimeout(() => scrollElementIntoView(elementId), timeout);
        return;
    }

    const element = document.getElementById(elementId);
    if (!element) console.warn("scrollElementIntoView elementId not found");
    else element.scrollIntoView({ behavior: "smooth", block: "start" });
}