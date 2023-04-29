import {EventEmitter} from "./EventEmitter.mjs";
import {UICabinetRoot} from "./UICabinetRoot.mjs";

export class UICabinetCharacter extends EventEmitter {
    static CHARACTER_SELECT = "character_select";
    static CHARACTER_DELETED = "deleted";

    container;
    name;
    chid;
    avatar;
    parent;

    constructor(datum) {
        super();
        this.name = datum.name;

        this.container = document.createElement("div");
        this.container.classList.add("character_select");
        this.chid = datum.chid;
        if(datum.chid) {
            this.container.setAttribute("chid", datum.chid);
        }
        let avatar = document.createElement("div");
            avatar.classList.add("avatar");
            this.container.appendChild(avatar);
        let img = document.createElement("img");
            img.setAttribute("src", "characters/" + datum.avatar + "?v="+Date.now());
            avatar.appendChild(img);
        this.avatar = datum.avatar;
        let charName = document.createElement("div");
            charName.classList.add("ch_name_menu");
            charName.appendChild(document.createTextNode(datum.name));
            this.container.appendChild(charName);

        let del = document.createElement("div");
            del.classList.add("delete");
            del.onclick = this.delete.bind(this);
            del.setAttribute("title", "Delete character");
            this.container.appendChild(del);

        this.container.onclick = function(id, event) {
            event.preventDefault();
            event.stopPropagation();
            this.emit(UICabinetCharacter.CHARACTER_SELECT, { chid: id });
        }.bind(this, datum.chid);

        this.container.setAttribute("draggable", "true");

        this.container.ondrag = this.onDrag.bind(this);
        this.container.ondragover = this.onDragOver.bind(this);
        this.container.ondrop = this.onDrop.bind(this);
    }

    onDrag(event) {
        event.preventDefault();
        event.stopPropagation();
        UICabinetRoot.dragged = this;
    }

    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    show() {
        this.container.classList.remove("hidden");
    }

    hide() {
        this.container.classList.add("hidden");
    }

    getSimple() {
        return {
            name: this.name,
            avatar: this.avatar
        };
    }

    delete(event) {
        event.preventDefault();
        event.stopPropagation();
        if(confirm("Delete \"" + this.name + "\"? This will also delete chat history.")) {
            this.container.parentNode.removeChild(this.container);
            this.parent = null;
            this.emit(UICabinetCharacter.CHARACTER_DELETED, { target: this, chid: this.chid, avatar: this.avatar });
        }
    }
}