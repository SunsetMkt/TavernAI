import {UICabinetFolder} from "./UICabinetFolder.mjs";
import {UICabinetCharacter} from "./UICabinetCharacter.mjs";
import {EventEmitter} from "./EventEmitter.mjs";

export class UICabinetRoot extends EventEmitter {
    static dragged;
    static activeFolder;

    /**  data structure
     * interface IFolderDatum = {
     *      children?: IFolderDatum[],
     *      name: string,
     *      id?: number, (for images)
     *      folder: boolean
     */
    data = {};
    characters = {};
    root;

    container;

    constructor(options) {
        super();
        this.characters = options.characters;
        this.container = options.container;
        this.load();
    }

    refresh(chars) {
        if(!this.container) {
            return;
        }
        if(chars) {
            this.characters = chars;
        }
        let i = 0;
        for(let key in this.characters) {
            this.characters[key].chid = i;
            i++;
        }
        this.container.innerHTML = null;
        this.root = new UICabinetFolder(this.data, this.characters);
        this.root.container.classList.add("root");
        this.root.on(UICabinetCharacter.CHARACTER_SELECT, function(event) {
            this.emit(UICabinetCharacter.CHARACTER_SELECT, event);
        }.bind(this));

        for(let key in this.characters) {
            this.root.addCharacter(this.characters[key]);
        }

        this.root.on(UICabinetCharacter.CHARACTER_DELETED, function(event) {
            this.emit(UICabinetCharacter.CHARACTER_DELETED, event);
            this.save();
        }.bind(this));
        this.root.on(UICabinetFolder.FOLDER_DELETED, function(event) {
            UICabinetRoot.activeFolder = event.active;
            UICabinetRoot.activeFolder.show();
            this.emit(UICabinetFolder.FOLDER_DELETED, event);
            this.save();
        }.bind(this));
        this.root.on(UICabinetFolder.SAVE_NEEDED, function(event) {
            this.save();
        }.bind(this));

        this.root.sort();

        UICabinetRoot.activeFolder = this.root;

        this.container.appendChild(this.root.container);

        this.save();
    }

    save() {
        return new Promise((resolve, reject) => {
            let data = this.root.getSimple();
            jQuery.ajax({
                type: 'POST',
                url: '/savefolders',
                data: JSON.stringify(data),
                beforeSend: function(){},
                cache: false,
                dataType: "json",
                contentType: "application/json",
                success: function(data){
                    resolve();
                },
                error: function (jqXHR, exception) {
                    console.error(jqXHR);
                    console.error(exception);
                    reject(jqXHR, exception);
                }
            });
        });
    }

    load() {
        return new Promise((resolve, reject) => {
            jQuery.ajax({
                type: 'POST',
                url: '/loadfolders',
                data: null,
                beforeSend: function(){},
                cache: false,
                dataType: "json",
                contentType: "application/json",
                success: function(data){
                    this.data = data || {};
                    this.refresh();
                    resolve();
                }.bind(this),
                error: function (jqXHR, exception) {
                    console.warn("Could not load folders. Defaulting to none.");
                    this.data = {};
                    this.refresh();
                    resolve();
                }.bind(this)
            });
        });
    }

    addFolder(name) {
        let out = UICabinetRoot.activeFolder.addFolder({
            name: name
        });
        if(!out) {
            this.save();
        }
        return out;
    }

    getFolderName(candidate) {
        return UICabinetRoot.activeFolder.getFolderName(candidate);
    }
}

