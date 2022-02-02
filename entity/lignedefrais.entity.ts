import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { IMission, Mission } from "./mission.entity";
import { INoteDeFrais, NoteDeFrais } from "./notedefrais.entity";
import { LIGNE_TYPE } from "./utils";
//ajouter a database.ts la classe 

export interface ILigneDeFrais {
    id: string;
    titre: string;
    date: Date;
    validee: boolean;
    prixHT: number;
    prixTTC: number;
    prixTVA: number;
    type: LIGNE_TYPE;
    justificatif: string;
    avance: boolean;
    commentaire: string;
    commentaire_validateur: string;
    perdu: boolean;
    //note: INoteDeFrais;
    //mission: IMission;
}

@Entity("lignedefrais")
export class LigneDeFrais implements ILigneDeFrais {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({type: "varchar"})
    public titre!: string;

    @Column({type: "date"})
    public date!: Date;

    @Column({type: "bool"})
    public validee!: boolean;

    @Column({type: "float"})
    public prixHT!: number;

    @Column({type: "float"})
    public prixTTC!: number;

    @Column({type: "float"})
    public prixTVA!: number;

    @Column({
        type: "enum",
        enum: Object.values(LIGNE_TYPE)
    })
    public type!: LIGNE_TYPE;

    @Column({type: "varchar"})
    public justificatif!: string;
    
    @Column({type: "bool"})
    public avance!: boolean;

    @Column({type: "varchar"})
    public commentaire!: string;

    @Column({type: "varchar"})
    public commentaire_validateur!: string;

    @Column({type: "bool"})
    public perdu!: boolean;

    @ManyToOne(() => NoteDeFrais)
    note!: NoteDeFrais;

    @ManyToOne(() => Mission)
    mission!: Mission;
}

export const lineToApi = (ligne: LigneDeFrais): ILigneDeFrais => {
    return {
        id: ligne.id,
        titre: ligne.titre,
        date: ligne.date,
        validee: ligne.validee,
        prixHT: ligne.prixHT,
        prixTTC: ligne.prixTTC,
        prixTVA: ligne.prixTVA,
        type: ligne.type,
        justificatif: ligne.justificatif,
        avance: ligne.avance,
        commentaire: ligne.commentaire,
        commentaire_validateur: ligne.commentaire_validateur,
        perdu: ligne.perdu,
        //note:
        //mission:
    };
}