import { connect } from "../../db/my_sql";
import { Casa } from "../../entities/casa_entity";

export class CasaGateway {
    async findAll(): Promise<Casa[]> {
        try {
            const conection = await connect();
            const query = "SELECT * FROM casas";
            const [rows] = await conection.execute(query);
            conection.end();
            return (rows as []).map((row: any) => new Casa(row.nome_proprietario, row.id, row.nivel_acesso));
        } catch (error: any) {
            throw new Error("Erro ao buscar casas" + error.message);

        }
    }

    async findByIDOrNomeProprietario(value: string): Promise<Casa> {
        try {
            const connection = await connect();
            let query = "";
            let params = [];
            const isNumeric = !isNaN(Number(value));
            if (isNumeric) {
                query = "SELECT * FROM casas WHERE id = ?";
                params = [Number(value)];
            } else {
                query = "SELECT * FROM casas WHERE nome_proprietario = ?";
                params = [value];
            }

            const [rows] = await connection.execute(query, params);
            connection.end();
            const casa = (rows as any)[0];
            return new Casa(casa.nome_proprietario, casa.id, casa.nivel_acesso)
        } catch (error: any) {
            throw new Error("Erro ao buscar casas");
        }
    }
}