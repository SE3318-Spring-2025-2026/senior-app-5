import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import {
  MarkdownDocument,
  MarkdownDocumentSchema,
} from './schemas/markdown-document.schema';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarkdownDocument.name, schema: MarkdownDocumentSchema },
    ]),
    SubmissionsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
