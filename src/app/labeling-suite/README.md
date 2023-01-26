## Basic idea

If there are questions please talk to the creator (Jens)

One component and one manager to rule them all.
This means we have the labeling main component as well as a general manager.
The page itself handles initialization and some html stuff but not a lot of logic.

The manger however handles everything data related. It in turn created a lot of other managers to structure the code a bit further.

Furthermore changes for settings or data can be "subscribed" to to the component handles the changes if e.g. a new record is loaded

## Components

### labeling-suite
Main component of the overall page. This hold general stuff and initializes everything.
Contains sub components, top and bottom navigation bar as well as the sessions modal.

### task-header
Sub component for display and preparation of the rla selection. Meaning what sources should be considered relevant for labeling & the overview table (if the setting is applied)

### labeling
Biggest component logic wise since there is a lot of stuff here specific only for the labeling page (e.g. distance for swim lanes).

### overview-table
Name is program -> holds display logic for the overview table


## Manager
The main manager (LabelingSuiteManager) hold all references to sub manager and some overarching logic like the absolute warnings or if something is loading
The other manager are designed to handle everything related to that specific field of interest => Modal manager handles modal stuff. 
Settings manager everything related to settings.

All managers hold a reference to the main manager to communicate if necessary or access data from other managers. 

Example:
When the record data is loaded from the backend not everything we need (or exclude) is provided to reduce the transfer amount.
All record label association are loaded from the backend and then manipulated depending on the provided settings (like filter only for manual).
