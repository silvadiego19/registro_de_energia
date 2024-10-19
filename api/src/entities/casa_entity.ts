export class Casa {
    nomeProprietario: string;
    constructor(nomeProprietario: string, readonly id: string, readonly nivelAcesso: string) {
        this.nomeProprietario = nomeProprietario;
    }
}