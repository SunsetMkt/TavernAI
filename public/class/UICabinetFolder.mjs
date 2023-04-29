import {EventEmitter} from "./EventEmitter.mjs";
import {UICabinetCharacter} from "./UICabinetCharacter.mjs";
import {UICabinetRoot} from "./UICabinetRoot.mjs";

export class UICabinetFolder extends EventEmitter {
    static FOLDER_DELETED = "folder_delete";
    static SAVE_NEEDED = "save_needed";

    container;
    childContainer;
    opened;
    children;
    folder = true;
    name;
    parent;

    constructor(datum, characters) {
        super();
        this.opened = datum.opened;
        this.name = datum.name;
        this.activeFolder = this;

        this.container = document.createElement("div");
        this.container.classList.add("folder_select");
        this.container.classList.add("folder");

        if(this.opened) {
            this.container.classList.add("opened");
        } else {
            this.container.classList.remove("opened");
        }

        let avatar = document.createElement("div");
            avatar.classList.add("avatar");
        this.container.appendChild(avatar);
        let charName = document.createElement("div");
            charName.classList.add("ch_name_menu");
            charName.appendChild(document.createTextNode(datum.name));
            this.container.appendChild(charName);

        let del = document.createElement("div");
            del.classList.add("delete");
            del.onclick = this.delete.bind(this);
            del.setAttribute("title", "Delete folder");
            this.container.appendChild(del);

        let ren = document.createElement("div");
            ren.classList.add("rename");
            ren.onclick = this.rename.bind(this);
            ren.setAttribute("title", "Rename folder");
            this.container.appendChild(ren);

        this.childContainer = document.createElement("div");
        this.childContainer.classList.add("children");

        this.container.appendChild(this.childContainer);

        this.children = [];

        (datum.children || []).forEach(child => {
            let instance;
            if(child.folder) {
                instance = new UICabinetFolder(child, characters);
                instance.on(UICabinetCharacter.CHARACTER_SELECT, function(event) {
                    this.emit(UICabinetCharacter.CHARACTER_SELECT, event);
                }.bind(this));
                instance.on(UICabinetFolder.SAVE_NEEDED, this.itemMoved.bind(this));
                instance.parent = this;
            } else {
                let char;
                characters.every((ch, i) => {
                    if(ch.avatar === child.avatar) {
                        char = characters.splice(i, 1)[0];
                        return false;
                    }
                    return true;
                });
                if(char) {
                    instance = new UICabinetCharacter(char);
                    instance.on(UICabinetCharacter.CHARACTER_SELECT, function(event) {
                        this.emit(UICabinetCharacter.CHARACTER_SELECT, event);
                    }.bind(this));
                    instance.on(UICabinetCharacter.CHARACTER_DELETED, this.charDeleted.bind(this));
                    instance.on(UICabinetFolder.SAVE_NEEDED, this.itemMoved.bind(this));
                    instance.parent = this;
                } else {
                    console.warn("Character " + child.name + " not found.");
                }
            }
            if(instance) {
                this.children.push(instance);
                this.childContainer.appendChild(instance.container);
            }
        });
        this.sort();

        if(!this.children.length) {
            this.container.classList.add("empty");
        }

        avatar.onclick = this.onClick.bind(this, false);
        charName.onclick = avatar.onclick;

        this.container.setAttribute("draggable", "true");

        this.container.ondrop = this.onDrop.bind(this);
        this.container.ondragover = this.onDragOver.bind(this);
        this.container.ondragleave = this.onDragLeave.bind(this);
        this.container.ondrag = this.onDrag.bind(this);
    }

    onDrag(event) {
        event.preventDefault();
        event.stopPropagation();
        UICabinetRoot.dragged = this;
    }

    onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        let item;
        UICabinetRoot.activeFolder.children.every((child, i) => {
            if(child.name === UICabinetRoot.dragged.name) {
                item = UICabinetRoot.activeFolder.children.splice(i, 1)[0];
                return false;
            }
            return true;
        });
        if(item) {
            if(this === UICabinetRoot.activeFolder) {
                item.container.classList.add("hidden");
                this.parent.children.push(item);
                this.parent.sort();
                this.parent.refreshEmpty();
            } else {
                this.children.push(item);
                this.sort();
            }
            this.refreshEmpty();
        }
        UICabinetRoot.dragged = null;
        this.container.classList.remove("dragover");
        this.emit(UICabinetFolder.SAVE_NEEDED, {});
        this.refreshEmpty();
    }

    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.container.classList.add("dragover");
    }

    onDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.container.classList.remove("dragover");
    }

    addFolder(options) {
        options.name = (options.name || "")
            .trim()
            .replace(/\s+/g, " ");
        if(!options.name || !options.name.length) {
            return "Cannot use this folder name.";
        }
        if(this.children.filter(child => child.folder && child.name.toLowerCase() == options.name.toLowerCase()).length > 0) {
            return "Folder already exists.";
        }
        let instance = new UICabinetFolder(options, {});
        instance.on(UICabinetFolder.SAVE_NEEDED, this.itemMoved.bind(this));
        instance.parent = this;
        this.children.push(instance);
        this.childContainer.appendChild(instance.container);
        this.sort();
        return null;
    }

    folderDeleted(event) {
        if(!event.nested) {
            this.children.forEach((child, i) => {
                if(child.folder && child.name === event.name) {
                    this.childContainer.removeChild(child.container);
                    this.children.splice(i, 1)[0];
                }
            });
            event.children.forEach((child, i) => {
                this.children.push(child);
            });
            event.active = this;
            event.nested = true;
            this.sort();
        }
    }

    itemMoved(event) {
        event.nested = true;
        this.emit(UICabinetFolder.SAVE_NEEDED, event);
        this.refreshEmpty();
    }

    charDeleted(event) {
        if(!event.nested) {
            this.children.forEach((ch, i) => {
                if(ch.chid === event.chid) {
                    this.children.splice(i, 1);
                    i--;
                }
                this.sort();
            });
            event.nested = true;
        }
        this.emit(UICabinetCharacter.CHARACTER_DELETED, event);
    }

    delete(event) {
        event.preventDefault();
        event.stopPropagation();
        if(confirm("Delete \"" + this.name + "\"? All contents will be moved to parent folder.")) {
            this.parent.children.forEach((ch, i) => {
                if(ch.folder && ch.name === this.name) {
                    this.parent.children.splice(i, 1);
                    i--;
                }
            });
            this.children.forEach(child => {
                this.parent.children.push(child);
                child.parent = this.parent;
                child.off(UICabinetCharacter.CHARACTER_SELECT);
                child.off(UICabinetCharacter.CHARACTER_DELETED);
                child.off(UICabinetFolder.SAVE_NEEDED);
                if(child.folder) {
                    child.on(UICabinetCharacter.CHARACTER_SELECT, function(event) {
                        this.parent.emit(UICabinetCharacter.CHARACTER_SELECT, event);
                    }.bind(this.parent));
                    child.on(UICabinetFolder.SAVE_NEEDED, this.itemMoved.bind(this.parent));
                } else {
                    child.on(UICabinetCharacter.CHARACTER_SELECT, function(event) {
                        this.emit(UICabinetCharacter.CHARACTER_SELECT, event);
                    }.bind(this.parent));
                    child.on(UICabinetCharacter.CHARACTER_DELETED, this.charDeleted.bind(this.parent));
                    child.on(UICabinetFolder.SAVE_NEEDED, this.itemMoved.bind(this.parent));
                }
            });
            this.parent.sort();
            this.destroy();
            this.emit(UICabinetFolder.SAVE_NEEDED, {});
        }
    }

    rename(event) {
        event.preventDefault();
        event.stopPropagation();
        let candidate = prompt("Rename folder \"" + this.name + "\" to:", this.name);
        if(candidate === this.name) {
            return;
        }
        this.name = this.getFolderName(candidate);
        for(let i = 0; i < this.container.children.length; i++) {
            const child = this.container.children[i];
            if(child.classList.contains("ch_name_menu")) {
                child.innerHTML = this.name;
            }
        }
        this.emit(UICabinetFolder.SAVE_NEEDED, {});
    }

    addCharacter(char) {
        let instance = new UICabinetCharacter(char);
        instance.on(UICabinetCharacter.CHARACTER_SELECT, function(event) {
            this.emit(UICabinetCharacter.CHARACTER_SELECT, event);
        }.bind(this));
        instance.on(UICabinetCharacter.CHARACTER_DELETED, this.charDeleted.bind(this));
        this.children.push(instance);
        this.childContainer.appendChild(instance.container);
        this.sort();
        return instance;
    }

    sort() {
        this.children.sort((a, b) => {
            if((a.folder && b.folder) || (!a.folder && !b.folder)) return a.name.localeCompare(b.name);
            return a.folder ? -1 : 1;
        });
        this.children.forEach(child => {
            this.childContainer.appendChild(child.container);
        });
    }

    show() {
        this.opened = true;
        this.container.classList.remove("hiddenParent");
        this.container.classList.remove("hidden");
        this.children.forEach(child => {
            child.container.classList.remove("hidden");
        });
    }

    hide(isParent) {
        this.opened = true;
        if(isParent) {
            this.container.classList.add("hiddenParent");
            this.container.classList.remove("hidden");
            this.children.forEach(child => {
                child.container.classList.add("hidden");
            });
        } else {
            this.container.classList.remove("hiddenParent");
            this.container.classList.add("hidden");
            this.children.forEach(child => {
                child.container.classList.remove("hidden");
            });
        }
    }

    onClick(noEmit, event) {
        event.preventDefault();
        event.stopPropagation();
        this.opened = !this.opened;
        if(this.opened) {
            this.parent.hide(true);
            this.container.classList.add("opened");
            this.container.classList.remove("hidden");
            UICabinetRoot.activeFolder = this;
        } else {
            this.parent.show();
            this.container.classList.remove("opened");
            UICabinetRoot.activeFolder = this.parent;
        }
    }

    refreshEmpty() {
        if(this.children.length) {
            this.container.classList.remove("empty");
        } else {
            this.container.classList.add("empty");
        }
    }

    getSimple() {
        return {
            name: this.name,
            folder: true,
            /*opened: this.opened,*/
            children: this.children.map(ch => ch.getSimple())
        };
    }

    getFolderName(candidate) {
        let match = false;
        let suffix = "";
        let i = 0;
        do {
            match = false;
            suffix = i === 0 ? "" : " #" + i;
            this.children.every(child => {
                if(child.folder && child.name.toLowerCase() === candidate.toLowerCase() + suffix) {
                    match = true;
                    return false;
                }
                return true;
            });
            i++;
        } while(match);
        return candidate + suffix;
    }

    destroy() {
        super.destroy();
        this.children = null;
        this.parent = null;
        if(this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}