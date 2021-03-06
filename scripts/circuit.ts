declare interface ObjectConstructor {
    assign(...objects: Object[]): Object;
}
//ALLOWS TWO CLASS INTANCES TO BE MERGED TOGETHER WITH FUNCTIONS
function forceAssignInstances(source: Object, target: Object) {
    for(let prop in source) {
        if(source.hasOwnProperty(prop)) {
            target[prop] = source[prop]
        }
    }
    //RETURN COPY OF TARGET
    return Object.assign(Object.create(Object.getPrototypeOf(target)), target);;
}

interface componentCallBack {
    (component: Component): void;
}

class Circuit {
    private ctx: any;
    rootComponent: Component;

    locX: number;
    locY: number;
    readonly componentSize: number;
    lastComponentId: number;

    resistance: number;
    current: number;

    hasFailed: boolean;

    constructor(ctx: any, locX: number, locY: number, componentSize: number) {
        this.ctx = ctx;
        
        this.locX = locX;
        this.locY = locY;
        this.componentSize = componentSize;

        this.rootComponent = new PowerSource(2, 0, 1);
        this.rootComponent.id = 0;
        this.lastComponentId = 0;

        this.resistance = 0;
        this.current = 0;

        this.hasFailed = false;
    }

    //THIS FUNCTION RE-INITIALIZES ALL CIRCUIT COMPONENTS AND ADDS CLASS FUNCTIONS
    reInitialize(circuitData: Circuit) {
        circuit.rootComponent = <Component>forceAssignInstances(circuitData.rootComponent, new PowerSource(0, 0, 0))
        this.reInitializeChildren(circuit.rootComponent);
    }

    reInitializeChildren(parent: Component) {
        if(parent.children.length > 0) {
            for(let i: number = 0; i < parent.children.length; i++) {
                parent.children[i] = this.reInitializeChildren(parent.children[i])
                
            }
        }
        if(this.componentIsRoot(parent.id)) {
            return parent;
        }

        let emptyComponent: Component;
        if(parent.type == 0) {
            emptyComponent = new PowerSource(0, 0, 0);
        } else if(parent.type == 1) {
            emptyComponent = new Lamp(0, 0);
        } else if(parent.type == 2) {
            emptyComponent = new Resistor(0, 0);
        } else if(parent.type == 3) {
            emptyComponent = new Switch(0);
            //JSON CONVERTS INFINITY TO NULL SO FIXES THAT        
            (<Switch>parent).offResistance = (<Switch>emptyComponent).offResistance;
            if((<Switch>parent).resistance == null) {
                (<Switch>parent).resistance = (<Switch>parent).offResistance
            }
        } else {
            emptyComponent = new Component(0, 0);
        }
        //REMOVE FOCUS FROM ALL ELEMENTS
        parent.hasFocus = false;
        //ASSIGN NEW IDS
        this.lastComponentId++;
        parent.id = this.lastComponentId;
        //RE-INITIALIZES INSTANCES
        return <Component>forceAssignInstances(parent, emptyComponent);
    }

    render() {
        //DRAWS WIRES COMPLETING CIRCUIT
        let width: number = (this.rootComponent.findLongestBranch(1) * 2 - 1) * this.componentSize;
        let height: number = this.rootComponent.findMaxChildren(1) * this.componentSize;

        this.ctx = drawLine(this.ctx, this.locX, this.locY, this.locX, this.locY + height, 'red');  
        this.ctx = drawLine(this.ctx, this.locX, this.locY + height, this.locX + width, this.locY + height, 'red');
        this.ctx = drawLine(this.ctx, this.locX + width, this.locY, this.locX + width, this.locY + height, 'red');

        this.rootComponent.render(this.ctx, this.locX, this.locY, this.componentSize);
    }

    componentIsRoot(componentId: number) {
        if(componentId == 0) {
            return true;
        }
        return false;
    }

    getComponentByCoords(x: number, y: number) {
        return this.rootComponent.getComponentByCoords(this.locX, this.locY, this.componentSize, x, y);
    }

    getComponentById(componentId: number, firstComponent = this.rootComponent) {
        if(firstComponent.id == componentId) {
            return firstComponent;
        } 

        //RECURSIVELY FINDS MACTHING ID
        let matchingComponent: Component;
        for(let i: number = 0; i < firstComponent.children.length; i++) {
            matchingComponent = this.getComponentById(componentId, firstComponent.children[i])
            if(matchingComponent != null) {
                return matchingComponent;
            }
        }

        return null;
    }

    getComponentParentById(componentId: number, firstComponent = this.rootComponent) {
        //RECURSIVELY FINDS MACTHING ID
        let matchingComponent: Component;
        for(let i: number = 0; i < firstComponent.children.length; i++) {
            if(firstComponent.children[i].id == componentId) {
                return firstComponent;
            } else {
                matchingComponent = this.getComponentParentById(componentId, firstComponent.children[i]);
                if(matchingComponent != null) {
                    return matchingComponent;
                }
            }
        }
        return null;
    }

    resetConsumption() {
        this.rootComponent.consumption = 0;
        this.forEachRootComponentInTree((component) => {
            for(let i: number; i < component.children.length; i++) {
                component.children[i].consumption = 0;
            }
        })
    }

    getLastComponentId() {
        //FINDS LAST COMPONENT
        let lastComponent: Component = this.rootComponent;

        while(lastComponent.children.length != 0) {
            lastComponent = lastComponent.children[0];
        }
        return lastComponent.id;
    }

    addComponent(parentId: number, component: Component) {
        let parentComponent: Component = this.getComponentById(parentId);
        if(parentComponent == null) {
            return;
        }

        this.lastComponentId++;
        component.id = this.lastComponentId;

        parentComponent.children.push(component)
    }

    deleteComponent(componentId: number) {
        let parentComponent: Component = this.getComponentParentById(componentId);
        for(let i = 0; i < parentComponent.children.length; i++) {
            if(parentComponent.children[i].id == componentId) {
                let componentChildren: Array<Component> = parentComponent.children[i].children;

                //REMOVES COMPONENT
                parentComponent.children = parentComponent.children.slice(0, i).concat(parentComponent.children.slice(i + 1));

                //IF REMOVED COMPONENT HAD CHILDREN, ADDS THEM TO PARENT COMPONENT
                if(componentChildren.length > 0) {
                    if(parentComponent.children.length > 0) {
                        parentComponent.children[0].children = componentChildren
                    } else {
                        parentComponent.children = componentChildren;
                    }
                }
                return true;
            }
        }
        return false;
    }

    forEachRootComponentInTree(callback: componentCallBack) {
        let currentComponent: Component = this.rootComponent;
        while(currentComponent.children.length != 0) {
            callback(currentComponent);
            currentComponent = currentComponent.children[0];
        }
    }

    simulate(time: number) {
        if(time == 0) {
            this.current = 0;
        }
        
        //RESET CIRCUIT INFO
        this.hasFailed = false

        //CALCULATE RESISTANCE
        this.resistance = this.rootComponent.resistance;

        let parallelResistances: Array<number> = [];
        let parallelResistance: number;

        this.forEachRootComponentInTree((currentComponent) => {
            //CALCULATE PARALLEL RESISTANCE
            parallelResistance = 0;
            for(let i: number = 0; i < currentComponent.children.length; i++) {
                parallelResistance += 1 / currentComponent.children[i].resistance;
            }
            parallelResistance = (1 / parallelResistance);

            parallelResistances.push(parallelResistance);
            this.resistance += (parallelResistance)
        })

        //CALCULATE

        this.current = this.rootComponent.voltage / this.resistance;
        //CALCULATE ALL COMPONENTS VOLTAGES, CURRENT, CONSUMPTION
        let parallelVoltages: Array<number> = [];
        for(let i: number = 0; i < parallelResistances.length; i++) {
            parallelVoltages.push(fixNaN(parallelResistances[i] * this.current));
        }

        let componentDepth: number = 0;
        this.forEachRootComponentInTree((currentComponent) => {
            for(let i: number = 0; i < currentComponent.children.length; i++) {
                currentComponent.children[i].voltage = parallelVoltages[componentDepth]
                currentComponent.children[i].current = fixNaN(parallelVoltages[componentDepth] / currentComponent.children[i].resistance);

                currentComponent.children[i].hasFailed = false;
                if(currentComponent.children[i].current > currentComponent.children[i].maxCurrent) {
                    //IF COMPONENT CURRENT IS HIGHER THAN MAX CURRENT, CIRCUIT FAILED FLAG IS TRUE
                    currentComponent.children[i].hasFailed = true;
                    this.hasFailed = true;
                } 

                currentComponent.children[i].consumption += currentComponent.children[i].voltage * currentComponent.children[i].current * time;       
            }
            componentDepth++;
        });

        //UPDATE ROOT COMPONENT AND CHECK FOR FAILURE
        this.rootComponent.hasFailed = false;
        this.rootComponent.current = this.current;
        if(this.rootComponent.current > this.rootComponent.maxCurrent) {
            this.rootComponent.hasFailed = true;
            this.hasFailed = true;
        }

        this.rootComponent.consumption += this.rootComponent.voltage * this.current * time;
    }
}