// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getCsrfToken, getSession } from 'next-auth/react';
import { getConnection } from 'typeorm';
import { RequestError } from '../../../entity/geneal_struct';
import { ILigneDeFrais, LigneDeFrais } from '../../../entity/lignedefrais.entity';
import { NoteDeFrais } from '../../../entity/notedefrais.entity';
import { prepareConnection } from '../database';



import nextConnect from 'next-connect';
import multer from 'multer';
import { LIGNEDEFRAIS_ETAT, NOTEDEFRAIS_ETAT } from '../../../entity/utils';
import { Avance } from '../../../entity/avance.entity';
import { Mission } from '../../../entity/mission.entity';
import { User } from '../../../entity/user.entity';

const upload = multer({
  storage: multer.diskStorage({
    destination: './public/justificatif',
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' +  file.originalname)
      }
  }),
});

export async function montantAvance(user:User, mission:Mission, montantAvance:number, montantRembourcement:number) {
  await prepareConnection();
  const conn = await getConnection();
  const avance = await conn.getRepository(Avance)
  .createQueryBuilder("avance")
  .where("avance.missionId = :missionId", {missionId: mission.id})
  .andWhere("avance.userId = :userId", {userId:user.id})
  .getOne();

  if(avance){
    await conn.createQueryBuilder()
    .update(Avance)
    .set(
      { 
        montant: avance.montant + montantAvance,
        rembourse: avance.rembourse + montantRembourcement
      }
    )
    .where("id = :id", {id: avance.id})
    .execute();

  }else if(montantAvance != 0.){
    await conn.createQueryBuilder()
    .insert()
    .into(Avance)
    .values([
      { 
        mission: mission,
        user: user,
        montant: montantAvance,
        rembourse: 0
      }
    ])
    .execute();
  }

  conn.close();
}


//ajoute une ligne a la bd
export async function insertLigne(data: LigneDeFrais, justificatif:string, user:User):Promise<boolean> {
  await prepareConnection();
  const conn = await getConnection();

  const file = data.justificatif;
  try {
    await conn.createQueryBuilder()
    .insert()
    .into(LigneDeFrais)
    .values([
      { 
        titre: data.titre,
        date: data.date,
        prixHT: data.prixTTC,
        prixTTC: data.prixTTC,
        prixTVA: data.prixTVA,
        type: data.type,
        justificatif: justificatif,
        avance: data.avance,
        commentaire: data.commentaire,
        perdu: data.perdu, 
        note: data.note,
        mission: data.mission,
        commentaire_validateur: ""
      }
    ])
    .execute();
    conn.close();
    if (data.avance) {
      montantAvance(user, data.mission, data.prixTTC, 0.)
    }else{
      montantAvance(user, data.mission, 0., data.prixTTC)
    }
    return true;
    
  } catch (error) {
    return false;    
  }
    
}


//met à jours une ligne 
export async function updateLigne(data: LigneDeFrais, justificatif:string, user:User):Promise<boolean> {
  var montantPrec = 0.;
  var montantRemb = 0.
  await prepareConnection();
  const conn = await getConnection();

  const avanceLigne = await conn.getRepository(LigneDeFrais)
  .createQueryBuilder("lignedefrais")
  .where("lignedefrais.id = :ligneId", {ligneId: data.id})
  .getOne()

  if(avanceLigne){
    if (avanceLigne.avance) {
      montantPrec = avanceLigne.prixTTC;
    } else {
      montantRemb = avanceLigne.prixTTC;
    }
  }

  const ligne = await conn.createQueryBuilder()
  .update(LigneDeFrais)
  .set(
    { 
      titre: data.titre,
      date: data.date,
      prixHT: data.prixTTC,
      prixTTC: data.prixTTC,
      prixTVA: data.prixTVA,
      type: data.type,
      justificatif: justificatif,
      avance: data.avance,
      commentaire: data.commentaire,
      perdu: data.perdu, 
      mission: data.mission,
      etat: LIGNEDEFRAIS_ETAT.BROUILLON
    }
  )
  .where("id = :id", {id: data.id})
  .execute();
  conn.close();

  if (data.avance) {
    montantAvance(user, data.mission, data.prixTTC-montantPrec, -montantRemb)
  }else if(montantPrec != 0.){
    montantAvance(user, data.mission, -montantPrec, montantRemb)
  }else{
    montantAvance(user, data.mission, 0., data.prixTTC-montantRemb)
  }

  return ligne.affected==0 ? false : true;
}



const apiRoute = nextConnect({
  onError(error, req, res:NextApiResponse) {
    res.status(501).json({ error: `Sorry something Happened! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single('justificatif'));

apiRoute.post(async (req:any, res:NextApiResponse) => {

  var userId: string | null = null;
    const session = await getSession({ req })
    if (session) {
      userId = (session as any)?.id;
    } else {
      res.status(403).json({error: "acces interdit" as string, code: 403});
      return;
    }

    await prepareConnection();
    const conn = getConnection();
    const notes = await conn.getRepository(NoteDeFrais)
      .createQueryBuilder("notedefrais")
      .where("id = :id", {id: req.body.note as string})
      .andWhere("userId = :user", {user:userId})
      .getOne();   

    if(!notes){
      res.status(404).json({error: "Notes non trouvée", code: 404});
      return;
    }else if (!(notes.etat === NOTEDEFRAIS_ETAT.BROUILLON || notes.etat === NOTEDEFRAIS_ETAT.REFUSEE)) {
      res.status(423).json({error: "Vous ne pouvez pas ajouté de ligne à cette notes" as string, code: 423});
    }
    
  if(await insertLigne(req.body,req.file.filename, session as any)){
    res.status(200).json({resultat: "ligne ajoutée"});
  }else{
    res.status(400).json({error : "Les donnée envoyé ne sont pas valide ou complète", code : 400})
  }
});

apiRoute.put(async (req:any, res:NextApiResponse) => {
    
  var userId: string | null = null;
    const session = await getSession({ req })
    if (session) {
      userId = (session as any)?.id;
    } else {
      res.status(403).json({error: "acces interdit" as string, code: 403});
    }

    await prepareConnection();
    const conn = getConnection();
    const notes = await conn.getRepository(NoteDeFrais)
      .createQueryBuilder("notedefrais")
      .where("id = :id", {id: req.body.note as string})
      .andWhere("userId = :user", {user:userId})
      .getOne();   

    if(!notes){
      res.status(404).json({error: "Notes non trouvée", code: 404});
    }else if (!(notes.etat === NOTEDEFRAIS_ETAT.BROUILLON || notes.etat === NOTEDEFRAIS_ETAT.REFUSEE)) {
      res.status(423).json({error: "Vous ne pouvez pas mettre à jours cette ligne" as string, code: 423});
    }

  if(await updateLigne(req.body, req.file.filename, session as any)){
    res.status(200).json({resultat: "ligne mise à jours"});
  }else{
    res.status(404).json({error: "Ligne non trouvée", code: 404});
  }
});


export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};