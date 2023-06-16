import * as Amqp from "amqp-ts";

const connectionsPool: {[key: string]: RabbitMQWrapper} = {};

export const getConnection = (host: string, port: number, user: string, password: string): RabbitMQWrapper => {
    const key = `${host}:${port}:${user}:${password}`;
    if (!connectionsPool[key]) {
        const connection = new Amqp.Connection(`amqp://${user}:${password}@${host}:${port}`);
        connectionsPool[key] = new RabbitMQWrapper(connection);
    }
    return connectionsPool[key];
};

export default class RabbitMQWrapper {
    public connection: Amqp.Connection;
    public exchanges: {[key: string]: Amqp.Exchange} = {};
    public queues: {[key: string]: Amqp.Queue} = {};
    constructor (connection: Amqp.Connection) {
        this.connection = connection;
    }

    public async prepareConsumer <T>(
        channelAndQueue: string, 
        callback: (message: T) => void, 
        channelOptions?: Amqp.Exchange.DeclarationOptions,
        queueOptions?: Amqp.Queue.DeclarationOptions) {
            const [channelName, queueName] = channelAndQueue.split(".");
            await this.getExchange(channelName, 'topic', channelOptions || {durable: false});
            const queue = await this.getQueue(channelAndQueue, queueOptions || { messageTtl: 2500, durable: false });
            queue.activateConsumer((message: Amqp.Message) => {
                callback(JSON.parse(message.getContent()) as T);
            }); 
    }

    public async publish <T>(channelAndQueue: string, message: T, channelOptions?: Amqp.Exchange.DeclarationOptions, queueOptions?: Amqp.Queue.DeclarationOptions) {
        const [channelName, queueName] = channelAndQueue.split(".");
        await this.getExchange(channelName, 'topic', channelOptions || {durable: false});
        const queue = await this.getQueue(channelAndQueue, queueOptions || { messageTtl: 2500, durable: false });
        const amqpMessage = new Amqp.Message(JSON.stringify(message));
        amqpMessage.sendTo(queue);
    }

    public wrapPublisher <T>(channelAndQueue: string, channelOptions?: Amqp.Exchange.DeclarationOptions, queueOptions?: Amqp.Queue.DeclarationOptions) {
        return (message: T) => this.publish(channelAndQueue, message, channelOptions, queueOptions);
    }

    private async getExchange (exchangeName: string, type: string, options?: any) {
        if (this.exchanges[exchangeName]) {
            return this.exchanges[exchangeName];
        }
        const exchange = this.connection.declareExchange(exchangeName, type, options);
        this.exchanges[exchangeName] = exchange;
        await exchange.initialized;
        return exchange;
    }

    private async getQueue (channelAndQueue: string, options?: Amqp.Queue.DeclarationOptions) {
        if (this.queues[channelAndQueue]) {
            return this.queues[channelAndQueue];
        }
        const [channelName, queueName] = channelAndQueue.split(".");
        const queue = this.connection.declareQueue(queueName, options);
        this.queues[queueName] = queue;
        await queue.initialized;
        const channel = await this.getExchange(channelName, 'direct', {durable: false});
        queue.bind(channel, '');
        return queue;
    }
}