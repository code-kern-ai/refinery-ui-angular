export declare interface DoBeforeDestroy {
    /**
     * A callback method that isn't automatically invoked but 
     * gives an entry point for destruction steps
     */
    doBeforeDestroy(): void;
}