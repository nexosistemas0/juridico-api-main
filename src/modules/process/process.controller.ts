import * as service from "./process.service.js";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import {findById as findCostumerById} from "../costumers/costumers.service.js";
import {findById as findLawyerById} from "../lawyers/lawyers.service.js";   

export async function getAllProcesses(req: Request, res: Response) {
    const processes = await service.findAll();
    return res.status(StatusCodes.OK).json(processes);
}

export async function getProcessById(req: Request, res: Response) {
    const { id } = req.params;
    const process = await service.findById(Number(id));
    if (!process) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: "Processo não encontrado" });
    } 
    return res.status(StatusCodes.OK).json(process);
}

export async function createProcess(req: Request, res: Response) {
    const { process_num, title, id_costumer, id_lawyer, status, area, court, observations } = req.body;

    // Check if costumer exists
    const costumer = await findCostumerById(id_costumer);
    if (!costumer) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Costumer not found" });
    }

    // Check if lawyer exists
    const lawyer = await findLawyerById(id_lawyer);
    if (!lawyer) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Lawyer not found" });
    }
    const newProcess = await service.createProcess({
        process_num,
        title,
        id_costumer,
        id_lawyer,
        status,
        area,
        court,
        observations
    });

    return res.status(StatusCodes.CREATED).json(newProcess);
}


export async function updateProcess(req: Request, res: Response) {
     const { process_num, title, id_costumer, id_lawyer, status, area, court, observations } = req.body;
     const id = Number(req.params.id);

    // Check if costumer exists
    const costumer = await findCostumerById(id_costumer);
    if (!costumer) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Costumer not found" });
    }

    // Check if lawyer exists
    const lawyer = await findLawyerById(id_lawyer);
    if (!lawyer) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Lawyer not found" });
    }

    const result = await service.updateProcess(id, {
        process_num, title, id_costumer, id_lawyer, status, area, court, observations
    });

    return res.status(StatusCodes.ACCEPTED).send("Usuario Mudado com sucesso!").json({costumer: result});
}